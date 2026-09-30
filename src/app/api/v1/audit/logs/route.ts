import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { queryAuditLog } from '@/lib/auditLog';
import { parseBusinessDate } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const { errorResponse } = validateApiAuth(req, 'accounting.audit.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const p = (k: string) => url.searchParams.get(k) || undefined;
    const date = (k: string) => {
      const v = p(k);
      if (!v) return undefined;
      const d = parseBusinessDate(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const to = date('endDate') ?? date('to');

    const logs = await queryAuditLog({
      entityType: p('entityType'),
      entityId: p('entityId'),
      userId: Number(p('userId')) || undefined,
      from: date('startDate') ?? date('from'),
      // Inclusive end date: include the whole day.
      to: to ? new Date(to.getTime() + 24 * 60 * 60 * 1000) : undefined,
      limit: parseInt(p('limit') || '200', 10) || 200,
    });

    return NextResponse.json({ status: 'SUCCESS', auditLogs: logs, count: logs.length });
  } catch (err) {
    return serverError(err, '/api/v1/audit/logs');
  }
}
