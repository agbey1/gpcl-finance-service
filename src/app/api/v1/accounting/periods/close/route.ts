import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { hasPermission } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization check
    const { session, errorResponse } = validateApiAuth(req, 'accounting.period.close');
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { closeDate, notes, force = false } = body;
    const year = Number(body.year);
    const periodNumber = Number(body.periodNumber);

    if (force) {
      const canForce = session && (
        session.role === 'ADMIN' ||
        session.role === 'SUPER_ADMIN' ||
        hasPermission(session, 'accounting.period.force_close')
      );
      if (!canForce) {
        return NextResponse.json(
          { status: 'ERROR', message: "Forbidden: Bypassing GL balance verification requires 'accounting.period.force_close' permission or Administrator role." },
          { status: 403 }
        );
      }
    }


    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > 12) {
      return NextResponse.json(
        { status: 'ERROR', message: 'year and periodNumber (1-12) are required.' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 2. Check if period is already closed
    const checkRes = await db.request()
      .input('y', year)
      .input('p', periodNumber)
      .query(`
        SELECT Id, IsClosed FROM FinancialPeriods WHERE FiscalYear = @y AND PeriodNumber = @p
      `);

    if (checkRes.recordset.length && checkRes.recordset[0].IsClosed) {
      return NextResponse.json(
        { status: 'ERROR', message: `Fiscal Period ${periodNumber}/${year} is already closed.` },
        { status: 409 }
      );
    }

    // 3. Pre-close GL Balance Verification
    if (!force) {
      const glBalanceRes = await db.request()
        .input('y', year)
        .input('p', periodNumber)
        .query(`
          SELECT 
            ISNULL(SUM(jel.Debit), 0) AS TotalDebit,
            ISNULL(SUM(jel.Credit), 0) AS TotalCredit
          FROM JournalEntryLines jel
          INNER JOIN JournalEntries e ON jel.JournalEntryId = e.Id
          WHERE YEAR(e.EntryDate) = @y AND MONTH(e.EntryDate) = @p AND e.Status = 'POSTED'
        `);

      const totalDebit = Number(glBalanceRes.recordset[0]?.TotalDebit || 0);
      const totalCredit = Number(glBalanceRes.recordset[0]?.TotalCredit || 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return NextResponse.json(
          {
            status: 'ERROR',
            code: 'PRE_CLOSE_VALIDATION_FAILED',
            message: `Cannot close period ${periodNumber}/${year}: General Ledger is un-balanced. Total Debits (${totalDebit.toFixed(2)}) != Total Credits (${totalCredit.toFixed(2)}).`,
            totalDebit,
            totalCredit,
            variance: Math.abs(totalDebit - totalCredit),
          },
          { status: 409 }
        );
      }
    }

    const cDate = closeDate ? new Date(closeDate) : new Date();

    if (checkRes.recordset.length) {
      await db.request()
        .input('y', year)
        .input('p', periodNumber)
        .input('closedBy', session!.userId)
        .input('closedAt', cDate)
        .input('notes', notes || 'Period closed via API')
        .query(`
          UPDATE FinancialPeriods
          SET IsClosed = 1, ClosedBy = @closedBy, ClosedAt = @closedAt, Notes = @notes
          WHERE FiscalYear = @y AND PeriodNumber = @p
        `);
    } else {
      await db.request()
        .input('y', year)
        .input('p', periodNumber)
        .input('closedBy', session!.userId)
        .input('closedAt', cDate)
        .input('notes', notes || 'Period closed via API')
        .query(`
          INSERT INTO FinancialPeriods
            (FiscalYear, PeriodNumber, IsClosed, ClosedBy, ClosedAt, Notes)
          VALUES
            (@y, @p, 1, @closedBy, @closedAt, @notes)
        `);
    }

    await logAudit({
      entityType: 'FINANCIAL_PERIOD',
      entityId: `${year}-${String(periodNumber).padStart(2, '0')}`,
      action: 'CLOSE',
      userId: session!.userId,
      newValue: { isClosed: true, closedAt: cDate.toISOString(), forced: Boolean(force), notes: notes || null },
      description: `Fiscal period ${periodNumber}/${year} closed${force ? ' (GL balance check bypassed)' : ''}`,
    });

    return NextResponse.json(
      {
        status: 'SUCCESS',
        fiscalYear: year,
        periodNumber,
        isClosed: true,
        closedAt: cDate.toISOString(),
        closedBy: session!.userId,
        notes: notes || 'Period closed successfully with GL pre-validation',
      },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/accounting/periods/close');
  }
}
