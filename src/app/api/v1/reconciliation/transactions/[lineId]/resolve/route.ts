import { NextRequest, NextResponse } from 'next/server';
import { resolveVariance, ReconciliationError } from '@/lib/reconciliation';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'reconciliation.manage');
  if (errorResponse) return errorResponse;

  try {
    const { lineId: rawId } = await params;
    const lineId = parseInt(rawId, 10);

    if (isNaN(lineId) || lineId <= 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid lineId parameter' },
        { status: 400 }
      );
    }

    // Get variance reason from request body
    const body = await req.json();
    const varianceReason = body.varianceReason || 'Manual resolution';

    if (!varianceReason || varianceReason.length === 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Variance reason is required' },
        { status: 400 }
      );
    }

    const userId = session!.userId;
    await resolveVariance(lineId, varianceReason, userId);

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Statement variance resolved and marked CLEARED',
      lineId,
      varianceReason,
    }, { status: 200 });
  } catch (err: any) {
    if (err instanceof ReconciliationError) {
      return NextResponse.json(
        { status: 'ERROR', message: err.message },
        { status: 404 }
      );
    }

    return serverError(err, '/api/v1/reconciliation/transactions/[lineId]/resolve');
  }
}
