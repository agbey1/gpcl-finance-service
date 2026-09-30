import { NextRequest, NextResponse } from 'next/server';
import { getBankTransactions } from '@/lib/reconciliation';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bankAccountId: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'reconciliation.manage');
  if (errorResponse) return errorResponse;

  try {
    const { bankAccountId: rawId } = await params;
    const bankAccountId = parseInt(rawId, 10);

    if (isNaN(bankAccountId) || bankAccountId <= 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid bankAccountId parameter' },
        { status: 400 }
      );
    }

    // Parse pagination parameters
    const url = new URL(req.url);
    const skip = Math.max(0, parseInt(url.searchParams.get('skip') || '0', 10));
    const take = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('take') || '10', 10))); // Cap at 1000
    const status = url.searchParams.get('status'); // Optional: UNMATCHED, CLEARED, VARIANCE

    // Validate status if provided
    if (status && !['UNMATCHED', 'CLEARED', 'VARIANCE'].includes(status)) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid status filter. Allowed: UNMATCHED, CLEARED, VARIANCE' },
        { status: 400 }
      );
    }

    const result = await getBankTransactions(bankAccountId, skip, take, status || undefined);

    return NextResponse.json({
      status: 'SUCCESS',
      bankAccountId,
      transactions: result.transactions,
      pagination: {
        skip: result.skip,
        take: result.take,
        total: result.total,
      },
    });
  } catch (err: any) {
    return serverError(err, '/api/v1/reconciliation/bank-accounts/[bankAccountId]/transactions');
  }
}
