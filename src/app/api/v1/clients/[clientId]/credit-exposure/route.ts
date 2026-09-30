import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { computeCreditExposure } from '@/lib/creditLimit';
import { validateApiAuth } from '@/lib/apiAuth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.invoices.view');
  if (errorResponse) return errorResponse;

  try {

    const { clientId: rawClientId } = await params;
    const clientId = parseInt(rawClientId, 10);

    if (isNaN(clientId) || clientId <= 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid clientId parameter' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const exposure = await computeCreditExposure(db, clientId);

    return NextResponse.json({
      status: 'SUCCESS',
      clientId: exposure.clientId,
      creditLimit: exposure.creditLimit,
      outstandingAR: exposure.outstandingAR,
      unappliedCredits: exposure.unappliedCredits,
      netExposure: exposure.netExposure,
      availableCredit: exposure.available === Number.POSITIVE_INFINITY ? null : exposure.available,
      isUnlimited: exposure.available === Number.POSITIVE_INFINITY,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
