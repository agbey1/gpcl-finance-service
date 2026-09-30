import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { generateFinancialRatiosReport } from '@/lib/financialRatios';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.view');
  if (errorResponse) return errorResponse;

  try {
    const report = await generateFinancialRatiosReport();

    return NextResponse.json(
      {
        status: 'SUCCESS',
        report,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/analytics/financial-ratios');
  }
}
