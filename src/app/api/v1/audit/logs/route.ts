import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/apiAuth';
import { getAuditLog, getAuditLogByDateRange, getAuditLogByUser } from '@/lib/auditLog';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.audit.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const entityType = url.searchParams.get('entityType');
    const entityId = url.searchParams.get('entityId');
    const userId = url.searchParams.get('userId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    let logs: any[] = [];

    if (entityType && entityId) {
      logs = await getAuditLog(entityType, entityId, limit);
    } else if (userId) {
      logs = await getAuditLogByUser(parseInt(userId, 10), limit);
    } else if (startDate && endDate) {
      logs = await getAuditLogByDateRange(new Date(startDate), new Date(endDate), limit);
    } else {
      return NextResponse.json(
        { status: 'ERROR', message: 'Please provide entityType+entityId, userId, or startDate+endDate' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        status: 'SUCCESS',
        auditLogs: logs,
        count: logs.length,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ status: 'ERROR', message: err.message || 'Internal server error' }, { status: 500 });
  }
}
