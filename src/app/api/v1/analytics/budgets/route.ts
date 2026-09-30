import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/apiAuth';
import { createBudget, listBudgets } from '@/lib/budgeting';
import { z } from 'zod';

const createBudgetSchema = z.object({
  budgetName: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  period: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']),
  fiscalYear: z.number().int().min(2020).max(2099),
  startPeriod: z.number().int().min(1).max(12).optional(),
  lineItems: z.array(z.object({
    accountCode: z.string().min(1).max(20),
    budgetAmount: z.number().positive(),
    notes: z.string().max(255).optional(),
  })).min(1),
});

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.budget.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const fiscalYear = parseInt(url.searchParams.get('fiscalYear') || new Date().getFullYear().toString(), 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const budgets = await listBudgets(fiscalYear, limit);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        budgets,
        count: budgets.length,
        fiscalYear,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ status: 'ERROR', message: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.budget.create');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parseResult = createBudgetSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          status: 'ERROR',
          message: 'Invalid request parameters',
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { budgetId, budgetName } = await createBudget({
      ...parseResult.data,
      createdBy: session?.userId || 1,
    });

    return NextResponse.json(
      {
        status: 'SUCCESS',
        budgetId,
        budgetName,
        message: 'Budget created successfully',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ status: 'ERROR', message: err.message || 'Internal server error' }, { status: 500 });
  }
}
