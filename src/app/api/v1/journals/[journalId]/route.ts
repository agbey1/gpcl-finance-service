import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth } from '@/lib/apiAuth';
import { ApiError, errorResponse } from '@/lib/apiErrors';

export async function GET(req: NextRequest, { params }: { params: Promise<{ journalId: string }> }) {
  const { errorResponse: authError } = validateApiAuth(req, 'accounting.journal.view');
  if (authError) return authError;

  try {
    const id = Number((await params).journalId);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Invalid journal ID');

    const db = await getDb();
    const head = await db.request().input('id', id).query(`
      SELECT je.Id, je.EntryNumber, je.EntryDate, je.Description, je.Reference, je.SourceModule,
             je.SourceId, je.Status, je.ReversalOfId, je.PostedBy, u.Name AS PostedByName, je.CreatedAt,
             (SELECT TOP 1 r.EntryNumber FROM JournalEntries r WHERE r.ReversalOfId = je.Id) AS ReversedBy
      FROM JournalEntries je
      LEFT JOIN Users u ON u.Id = je.PostedBy
      WHERE je.Id = @id
    `);
    if (!head.recordset.length) throw new ApiError(404, 'Journal entry not found');

    const lines = await db.request().input('id', id).query(`
      SELECT l.Id, a.Code AS AccountCode, a.AccountName, l.Description, l.Debit, l.Credit, l.BranchId
      FROM JournalEntryLines l
      INNER JOIN Accounts a ON a.Id = l.AccountId
      WHERE l.JournalEntryId = @id
      ORDER BY l.Id
    `);

    return NextResponse.json({ status: 'SUCCESS', journalEntry: { ...head.recordset[0], lines: lines.recordset } });
  } catch (err) {
    return errorResponse(err, 'GET /api/v1/journals/[journalId]');
  }
}
