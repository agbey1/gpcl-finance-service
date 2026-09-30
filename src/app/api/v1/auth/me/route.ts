import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      token = req.cookies.get('token')?.value || null;
    }

    if (!token) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Authentication token missing' },
        { status: 401 }
      );
    }

    const session = verifyJwt(token);
    if (!session) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: 'SUCCESS',
      user: session,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
