import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

/**
 * Fiscal periods (calendar months) for a year, including months that have no
 * FinancialPeriods row yet (which are open), plus posting activity per month.
 */
export async function GET(req: NextRequest) {
  const { errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const year = parseInt(new URL(req.url).searchParams.get('year') || '', 10) || new Date().getUTCFullYear();
    if (year < 2000 || year > 2100) {
      return NextResponse.json({ status: 'ERROR', message: 'Invalid year' }, { status: 400 });
    }

    const db = await getDb();
    const [closed, activity] = await Promise.all([
      db.request().input('y', year).query(`
        SELECT fp.PeriodNumber, fp.IsClosed, fp.ClosedAt, fp.Notes, u.Email AS ClosedByEmail
        FROM FinancialPeriods fp
        LEFT JOIN Users u ON u.Id = fp.ClosedBy
        WHERE fp.FiscalYear = @y
      `),
      db.request().input('y', year).query(`
        SELECT MONTH(e.EntryDate) AS PeriodNumber, COUNT(DISTINCT e.Id) AS Entries,
               ISNULL(SUM(l.Debit), 0) AS TotalDebit, ISNULL(SUM(l.Credit), 0) AS TotalCredit
        FROM JournalEntries e
        INNER JOIN JournalEntryLines l ON l.JournalEntryId = e.Id
        WHERE e.Status = 'POSTED' AND e.EntryDate >= DATEFROMPARTS(@y, 1, 1) AND e.EntryDate < DATEFROMPARTS(@y + 1, 1, 1)
        GROUP BY MONTH(e.EntryDate)
      `),
    ]);

    const byNum = <T extends { PeriodNumber: number }>(rows: T[]) => new Map(rows.map((r) => [r.PeriodNumber, r]));
    const closedMap = byNum(closed.recordset as { PeriodNumber: number; IsClosed: boolean; ClosedAt: string | null; Notes: string | null; ClosedByEmail: string | null }[]);
    const actMap = byNum(activity.recordset as { PeriodNumber: number; Entries: number; TotalDebit: number; TotalCredit: number }[]);

    const periods = Array.from({ length: 12 }, (_, i) => {
      const n = i + 1;
      const c = closedMap.get(n);
      const a = actMap.get(n);
      return {
        fiscalYear: year,
        periodNumber: n,
        startDate: new Date(Date.UTC(year, i, 1)).toISOString().slice(0, 10),
        endDate: new Date(Date.UTC(year, i + 1, 0)).toISOString().slice(0, 10),
        isClosed: Boolean(c?.IsClosed),
        closedAt: c?.ClosedAt ?? null,
        closedBy: c?.ClosedByEmail ?? null,
        notes: c?.Notes ?? null,
        entries: a?.Entries ?? 0,
        totalDebit: Number(a?.TotalDebit ?? 0),
        totalCredit: Number(a?.TotalCredit ?? 0),
      };
    });

    return NextResponse.json({ status: 'SUCCESS', year, periods });
  } catch (err) {
    return serverError(err, '/api/v1/accounting/periods');
  }
}
