import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { status: 'ERROR', message: 'Invalid, expired or missing token' },
      { status: 401 }
    );
  }
  return NextResponse.json({ status: 'SUCCESS', user: session });
}
