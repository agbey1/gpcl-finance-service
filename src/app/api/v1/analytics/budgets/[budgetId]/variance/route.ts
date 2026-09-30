import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { getBudgetWithVariance } from '@/lib/budgeting';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.budget.view');
  if (errorResponse) return errorResponse;

  try {
    const { budgetId } = await params;
    const id = parseInt(budgetId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ status: 'ERROR', message: 'Invalid budget ID' }, { status: 400 });
    }

    const budget = await getBudgetWithVariance(id);

    if (!budget) {
      return NextResponse.json({ status: 'ERROR', message: 'Budget not found' }, { status: 404 });
    }

    // Calculate summary metrics
    const favorableVariances = budget.variance.filter((v: any) => v.status === 'FAVORABLE').length;
    const unfavorableVariances = budget.variance.filter((v: any) => v.status === 'UNFAVORABLE').length;
    const onTrackVariances = budget.variance.filter((v: any) => v.status === 'ON_TRACK').length;

    return NextResponse.json(
      {
        status: 'SUCCESS',
        budget: {
          id: budget.Id,
          name: budget.BudgetName,
          period: budget.Period,
          fiscalYear: budget.FiscalYear,
          status: budget.Status,
          createdAt: budget.CreatedAt,
        },
        summary: {
          totalBudget: Number(budget.totalBudget.toFixed(2)),
          totalActual: Number(budget.totalActual.toFixed(2)),
          totalVariance: Number((budget.totalBudget - budget.totalActual).toFixed(2)),
          favorableCount: favorableVariances,
          unfavorableCount: unfavorableVariances,
          onTrackCount: onTrackVariances,
        },
        variance: budget.variance,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/analytics/budgets/[budgetId]/variance');
  }
}
