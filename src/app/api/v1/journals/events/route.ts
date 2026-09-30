import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { postJournal } from '@/lib/accounting';
import { validateApiAuth } from '@/lib/apiAuth';
import { errorResponse, parseBody, withIdempotency } from '@/lib/apiErrors';
import { businessDate, parseBusinessDate } from '@/lib/dates';
import { logAudit } from '@/lib/auditLog';

const journalSchema = z.object({
  sourceModule: z.string().trim().min(1).max(50),
  sourceId: z.union([z.string().trim().min(1).max(50), z.number().int()]),
  entryDate: businessDate.optional(),
  description: z.string().trim().max(500).optional(),
  reference: z.string().trim().max(100).optional(),
  lines: z
    .array(
      z.object({
        accountCode: z.string().trim().min(1).max(20),
        description: z.string().trim().max(500).optional(),
        debit: z.number().finite().nonnegative().max(1e12).optional(),
        credit: z.number().finite().nonnegative().max(1e12).optional(),
        branchId: z.number().int().positive().optional().nullable(),
      })
    )
    .min(2)
    .max(500),
});

export async function POST(req: NextRequest) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'accounting.journal.post');
  if (authError || !session) return authError!;

  return withIdempotency(req, 'journals.post', session.userId, async () => {
    try {
      const input = await parseBody(req, journalSchema);
      const entryDate = input.entryDate ? parseBusinessDate(input.entryDate) : new Date();

      // postJournal validates balance, line shape, accounts and the fiscal period.
      const result = await postJournal({
        entryDate,
        description: input.description || `Journal entry from ${input.sourceModule}`,
        reference: input.reference,
        sourceModule: input.sourceModule,
        sourceId: input.sourceId,
        lines: input.lines,
        postedBy: session.userId,
        allowControlAccounts: !input.sourceModule.toUpperCase().startsWith('MANUAL'),
      });

      await logAudit({
        entityType: 'JOURNAL_ENTRY',
        entityId: result.journalEntryId,
        action: 'POST',
        userId: session.userId,
        newValue: { entryNumber: result.entryNumber, entryDate: entryDate.toISOString(), ...input },
        description: `Manual journal ${result.entryNumber} posted`,
      });

      return NextResponse.json(
        {
          status: 'SUCCESS',
          journalEntryId: result.journalEntryId,
          entryNumber: result.entryNumber,
          postedAt: new Date().toISOString(),
        },
        { status: 201 }
      );
    } catch (err) {
      return errorResponse(err, 'POST /api/v1/journals/events');
    }
  });
}
