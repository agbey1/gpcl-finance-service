import { NextResponse } from 'next/server';
import { pingDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Liveness/readiness probe. Public (no auth) and intentionally minimal: it
 * reports only whether the process is up and the database is reachable.
 */
export async function GET() {
  const database = await pingDb();
  return NextResponse.json(
    { status: database ? 'ok' : 'degraded', database: database ? 'up' : 'down', time: new Date().toISOString() },
    { status: database ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
