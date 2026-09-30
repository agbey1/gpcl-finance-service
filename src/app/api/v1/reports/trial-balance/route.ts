import { NextRequest, NextResponse } from 'next/server';
import { accountBalances, naturalBalance } from '@/lib/ledger';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const asOf = url.searchParams.get('asOf');
    const to = asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : new Date().toISOString().slice(0, 10);
    const accounts = await accountBalances({ to });

    const totalDebitCents = accounts.reduce((s, a) => s + Math.round(a.TotalDebit * 100), 0);
    const totalCreditCents = accounts.reduce((s, a) => s + Math.round(a.TotalCredit * 100), 0);

    return NextResponse.json({
      status: 'SUCCESS',
      reportDate: to,
      trialBalance: accounts.map((a) => ({ ...a, Balance: naturalBalance(a) })),
      totals: {
        totalDebit: totalDebitCents / 100,
        totalCredit: totalCreditCents / 100,
        variance: Math.abs(totalDebitCents - totalCreditCents) / 100,
        isBalanced: totalDebitCents === totalCreditCents,
      },
    });
  } catch (err) {
    return serverError(err, '/api/v1/reports/trial-balance');
  }
}
