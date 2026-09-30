import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, sql } from '@/lib/db';
import { postJournalInTx, type JournalLine } from '@/lib/accounting';
import { validateApiAuth } from '@/lib/apiAuth';
import { ApiError, errorResponse } from '@/lib/apiErrors';
import { businessDate, parseBusinessDate } from '@/lib/dates';
import { logAudit } from '@/lib/auditLog';

const reverseSchema = z.object({
  reason: z.string().trim().min(3, 'A reason is required.').max(400),
  reversalDate: businessDate.optional(),
});

/**
 * Reverses a manual journal by posting its mirror image. The original stays
 * POSTED (so period reports remain correct) and is linked via ReversalOfId.
 * Journals created by invoices, payments or credit notes must be corrected
 * through those documents so the sub-ledgers stay in step with the GL.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ journalId: string }> }) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'accounting.journal.reverse');
  if (authError || !session) return authError!;

  try {
    const id = Number((await params).journalId);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Invalid journal ID');
    const { reason, reversalDate } = reverseSchema.parse(await req.json().catch(() => ({})));
    const date = reversalDate ? parseBusinessDate(reversalDate) : new Date();

    const db = await getDb();
    const tx = new sql.Transaction(db);
    await tx.begin();
    let entryNumber: string;
    let original: { EntryNumber: string; SourceModule: string; ReversalOfId: number | null };
    try {
      const head = await new sql.Request(tx).input('id', id).query(`
        SELECT EntryNumber, SourceModule, ReversalOfId, Status
        FROM JournalEntries WITH (UPDLOCK, ROWLOCK)
        WHERE Id = @id
      `);
      original = head.recordset[0];
      if (!original) throw new ApiError(404, 'Journal entry not found');
      if (!original.SourceModule.toUpperCase().startsWith('MANUAL')) {
        throw new ApiError(
          409,
          `Journals from ${original.SourceModule} must be corrected through their source document (void or credit note).`,
          'NOT_MANUAL_JOURNAL'
        );
      }
      if (original.ReversalOfId) throw new ApiError(409, 'A reversal entry cannot itself be reversed.');

      const existing = await new sql.Request(tx).input('id', id)
        .query('SELECT TOP 1 EntryNumber FROM JournalEntries WHERE ReversalOfId = @id');
      if (existing.recordset.length) {
        throw new ApiError(409, `Already reversed by ${existing.recordset[0].EntryNumber}.`, 'ALREADY_REVERSED');
      }

      const linesRes = await new sql.Request(tx).input('id', id).query(`
        SELECT a.Code AS AccountCode, l.Description, l.Debit, l.Credit, l.BranchId
        FROM JournalEntryLines l INNER JOIN Accounts a ON a.Id = l.AccountId
        WHERE l.JournalEntryId = @id ORDER BY l.Id
      `);
      const lines: JournalLine[] = linesRes.recordset.map(
        (l: { AccountCode: string; Description: string | null; Debit: number; Credit: number; BranchId: number | null }) => ({
          accountCode: l.AccountCode,
          description: `Reversal: ${l.Description ?? original.EntryNumber}`,
          debit: Number(l.Credit) || undefined,
          credit: Number(l.Debit) || undefined,
          branchId: l.BranchId,
        })
      );

      const result = await postJournalInTx(tx, db, {
        entryDate: date,
        description: `Reversal of ${original.EntryNumber} - ${reason}`,
        reference: `REV-${original.EntryNumber}`,
        sourceModule: 'MANUAL_REVERSAL',
        sourceId: id,
        lines,
        postedBy: session.userId,
        reversalOfId: id,
      });
      entryNumber = result.entryNumber;
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    await logAudit({
      entityType: 'JOURNAL_ENTRY',
      entityId: id,
      action: 'VOID',
      userId: session.userId,
      newValue: { reversedBy: entryNumber, reason },
      description: `Journal ${original.EntryNumber} reversed by ${entryNumber}: ${reason}`,
    });

    return NextResponse.json({ status: 'SUCCESS', originalEntryNumber: original.EntryNumber, reversalEntryNumber: entryNumber });
  } catch (err) {
    return errorResponse(err, 'POST /api/v1/journals/[journalId]/reverse');
  }
}
