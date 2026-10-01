import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, sql } from '@/lib/db';
import { validateApiAuth } from '@/lib/apiAuth';
import { ApiError, errorResponse, parseBody } from '@/lib/apiErrors';
import { logAudit } from '@/lib/auditLog';

const bodySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  periodNumber: z.coerce.number().int().min(1).max(12),
  reason: z.string().trim().min(10, 'Give a reason of at least 10 characters.').max(500),
});

/**
 * Re-opens a closed fiscal period. Restricted to SUPER_ADMIN (ADMIN can close
 * but not re-open) and always audited with the reason.
 */
export async function POST(req: NextRequest) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'accounting.period.close');
  if (authError) return authError;
  if (session!.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { status: 'ERROR', message: 'Forbidden: only a Super Administrator can re-open a closed period.' },
      { status: 403 },
    );
  }

  try {
    const { year, periodNumber, reason } = await parseBody(req, bodySchema);
    const db = await getDb();
    const tx = new sql.Transaction(db);
    await tx.begin();
    let before: { Id: number; ClosedAt: Date | null; ClosedBy: number | null; Notes: string | null };
    try {
      const r = await new sql.Request(tx)
        .input('y', year)
        .input('p', periodNumber)
        .query(`
          SELECT Id, IsClosed, ClosedAt, ClosedBy, Notes FROM FinancialPeriods WITH (UPDLOCK, HOLDLOCK)
          WHERE FiscalYear = @y AND PeriodNumber = @p
        `);
      const row = r.recordset[0];
      if (!row?.IsClosed) throw new ApiError(409, `Fiscal period ${periodNumber}/${year} is not closed.`);
      before = row;

      const stamp = new Date().toISOString().slice(0, 10);
      await new sql.Request(tx)
        .input('id', row.Id)
        .input('notes', `Re-opened ${stamp} by ${session!.email}: ${reason}`)
        .query(`UPDATE FinancialPeriods SET IsClosed = 0, ClosedAt = NULL, ClosedBy = NULL, Notes = @notes WHERE Id = @id`);
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    await logAudit({
      entityType: 'FINANCIAL_PERIOD',
      entityId: `${year}-${String(periodNumber).padStart(2, '0')}`,
      action: 'REOPEN',
      userId: session!.userId,
      oldValue: { isClosed: true, closedAt: before.ClosedAt, closedBy: before.ClosedBy, notes: before.Notes },
      newValue: { isClosed: false, reason },
      description: `Fiscal period ${periodNumber}/${year} re-opened: ${reason}`,
    });

    return NextResponse.json({ status: 'SUCCESS', fiscalYear: year, periodNumber, isClosed: false });
  } catch (err) {
    return errorResponse(err, '/api/v1/accounting/periods/reopen');
  }
}
