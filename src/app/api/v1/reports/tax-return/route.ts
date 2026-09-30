import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { accountBalances } from '@/lib/ledger';
import { VAT_RATE, NHIS_RATE, GETFUND_RATE } from '@/lib/ghanaLevies';

// GL accounts the invoice, void and credit-note postings use.
const LEVY_ACCOUNTS = [
  { code: '2100', levy: 'VAT', rate: VAT_RATE },
  { code: '2102', levy: 'NHIL', rate: NHIS_RATE },
  { code: '2103', levy: 'GETFund', rate: GETFUND_RATE },
] as const;
const SALES_ACCOUNT = '4001';

/**
 * Output levies for a period, taken from the general ledger so that voids and
 * credit notes are already netted off. Defaults to the previous calendar month
 * (the usual GRA filing period).
 */
export async function GET(req: NextRequest) {
  const { errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const now = new Date();
    const defFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
    const defTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).toISOString().slice(0, 10);
    const from = isDate(url.searchParams.get('from')) ? url.searchParams.get('from')! : defFrom;
    const to = isDate(url.searchParams.get('to')) ? url.searchParams.get('to')! : defTo;
    if (from > to) {
      return NextResponse.json({ status: 'ERROR', message: '`from` must not be after `to`.' }, { status: 400 });
    }

    const rows = await accountBalances({ from, to });
    const credit = (code: string) => {
      const r = rows.find((x) => x.AccountCode === code);
      return r ? Math.round((r.TotalCredit - r.TotalDebit) * 100) / 100 : 0;
    };

    const taxableSales = credit(SALES_ACCOUNT);
    const levies = LEVY_ACCOUNTS.map((l) => ({
      levy: l.levy,
      accountCode: l.code,
      rate: l.rate,
      amount: credit(l.code),
      expected: Math.round(taxableSales * l.rate * 100) / 100,
    }));
    const totalLevies = Math.round(levies.reduce((s, l) => s + l.amount * 100, 0)) / 100;

    const db = await getDb();
    const counts = await db.request().input('from', from).input('to', to).query(`
      SELECT
        (SELECT COUNT(*) FROM Invoices WHERE Status <> 'VOID' AND InvoiceDate >= CAST(@from AS date) AND InvoiceDate < DATEADD(day, 1, CAST(@to AS date))) AS Invoices,
        (SELECT COUNT(*) FROM CreditNotes WHERE CreditNoteDate >= CAST(@from AS date) AND CreditNoteDate < DATEADD(day, 1, CAST(@to AS date))) AS CreditNotes
    `);

    return NextResponse.json({
      status: 'SUCCESS',
      period: { from, to },
      taxableSales,
      levies,
      totalLevies,
      grossSales: Math.round((taxableSales + totalLevies) * 100) / 100,
      invoiceCount: counts.recordset[0]?.Invoices ?? 0,
      creditNoteCount: counts.recordset[0]?.CreditNotes ?? 0,
      note: 'Output levies only. Input VAT is not tracked by this service.',
    });
  } catch (err) {
    return serverError(err, '/api/v1/reports/tax-return');
  }
}
