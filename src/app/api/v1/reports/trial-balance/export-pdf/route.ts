import { NextRequest, NextResponse } from 'next/server';
import { accountBalances } from '@/lib/ledger';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { generatePDF } from '@/lib/pdfExport';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const asOf = new URL(req.url).searchParams.get('asOf');
    const rows = await accountBalances({ to: asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : undefined });

    const accounts = rows;
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
