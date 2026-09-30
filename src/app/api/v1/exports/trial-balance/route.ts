import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { generateExcel, generateCSV, prepareGLExport } from '@/lib/dataExport';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'xlsx'; // xlsx or csv

    const db = await getDb();

    const result = await db.request().query(`
      SELECT
        coa.AccountCode,
        coa.AccountName,
        coa.AccountType,
        ISNULL(SUM(jel.Debit), 0) AS TotalDebit,
        ISNULL(SUM(jel.Credit), 0) AS TotalCredit
      FROM ChartOfAccounts coa
      LEFT JOIN JournalEntryLines jel ON coa.Id = jel.AccountId
      LEFT JOIN JournalEntries je ON jel.JournalEntryId = je.Id AND je.Status = 'POSTED'
      GROUP BY coa.AccountCode, coa.AccountName, coa.AccountType
      ORDER BY coa.AccountCode ASC
    `);

    const { columns, data, totals } = prepareGLExport(result.recordset);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `trial-balance-${timestamp}`;

    if (format === 'csv') {
      const csv = generateCSV(columns, data, totals);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      const buffer = generateExcel([
        {
          sheetName: 'Trial Balance',
          columns,
          data,
          totals,
        },
      ]);

      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
  } catch (err: any) {
    return serverError(err, '/api/v1/exports/trial-balance');
  }
}
