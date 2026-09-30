import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/apiAuth';

export async function POST() {
  const res = NextResponse.json({ status: 'SUCCESS' });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
