import { NextRequest, NextResponse } from 'next/server';
import { accountBalances, buildStatements, naturalBalance } from '@/lib/ledger';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const to = isDate(url.searchParams.get('to')) ? url.searchParams.get('to')! : new Date().toISOString().slice(0, 10);
    const from = isDate(url.searchParams.get('from')) ? url.searchParams.get('from')! : `${to.slice(0, 4)}-01-01`;
    if (from > to) {
      return NextResponse.json({ status: 'ERROR', message: '`from` must not be after `to`.' }, { status: 400 });
    }

    const [periodRows, cumulativeRows] = await Promise.all([accountBalances({ from, to }), accountBalances({ to })]);
    const statements = buildStatements(periodRows, cumulativeRows);

    return NextResponse.json({
      status: 'SUCCESS',
      reportDate: to,
      period: { from, to },
      ...statements,
      accounts: periodRows.map((a) => ({ ...a, Balance: naturalBalance(a) })),
    });
  } catch (err) {
    return serverError(err, '/api/v1/reports/financial-statements');
  }
}
