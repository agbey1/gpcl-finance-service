import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { generatePDF } from '@/lib/pdfExport';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
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

    const accounts = result.recordset;
    const totalDebit = accounts.reduce((sum: number, acc: any) => sum + Number(acc.TotalDebit), 0);
    const totalCredit = accounts.reduce((sum: number, acc: any) => sum + Number(acc.TotalCredit), 0);

    // Prepare table data
    const tableData = accounts.map((acc: any) => [
      acc.AccountCode,
      acc.AccountName,
      acc.AccountType,
      Number(acc.TotalDebit).toFixed(2),
      Number(acc.TotalCredit).toFixed(2),
    ]);

    // Add totals row
    tableData.push([
      'TOTALS',
      '',
      '',
      totalDebit.toFixed(2),
      totalCredit.toFixed(2),
    ]);

    const pdfBuffer = generatePDF({
      title: 'Trial Balance Report',
      filename: `trial-balance-${new Date().toISOString().slice(0, 10)}.pdf`,
      reportDate: new Date().toISOString().slice(0, 10),
      columns: ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit'],
      data: tableData,
    });

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="trial-balance-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (err: any) {
    return serverError(err, '/api/v1/reports/trial-balance/export-pdf');
  }
}
