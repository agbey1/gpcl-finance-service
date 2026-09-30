import { getDb, type ConnectionPool } from '@/lib/db';
import { logger } from '@/lib/logger';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'VOID' | 'CLOSE';

export type AuditLogEntry = {
  entityType: string;
  entityId: string | number;
  action: AuditAction;
  userId: number;
  oldValue?: any;
  newValue?: any;
  description?: string;
  ipAddress?: string;
};

/**
 * Log an audit trail entry for compliance and traceability
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getDb();

    await db.request()
      .input('entityType', entry.entityType)
      .input('entityId', entry.entityId.toString())
      .input('action', entry.action)
      .input('userId', entry.userId)
      .input('oldValue', entry.oldValue ? JSON.stringify(entry.oldValue) : null)
      .input('newValue', entry.newValue ? JSON.stringify(entry.newValue) : null)
      .input('description', entry.description || null)
      .input('ipAddress', entry.ipAddress || null)
      .query(`
        INSERT INTO AuditLog (
          EntityType,
          EntityId,
          Action,
          UserId,
          OldValue,
          NewValue,
          Description,
          IpAddress,
          CreatedAt
        )
        VALUES (
          @entityType,
          @entityId,
          @action,
          @userId,
          @oldValue,
          @newValue,
          @description,
          @ipAddress,
          GETDATE()
        )
      `);
  } catch (err: any) {
    // Don't fail the main operation if audit logging fails
    logger.error('Failed to log audit trail', { error: err.message, entry });
  }
}

export type AuditQuery = {
  entityType?: string;
  entityId?: string;
  userId?: number;
  from?: Date;
  to?: Date;
  limit?: number;
};

/**
 * Audit trail search. All filters are optional; results are newest first.
 * Errors propagate so callers can report a failure instead of an empty trail.
 */
export async function queryAuditLog(q: AuditQuery): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  const req = db.request().input('limit', Math.min(1000, Math.max(1, q.limit ?? 100)));
  const where: string[] = [];
  if (q.entityType) { where.push('a.EntityType = @entityType'); req.input('entityType', q.entityType); }
  if (q.entityId) { where.push('a.EntityId = @entityId'); req.input('entityId', q.entityId); }
  if (q.userId) { where.push('a.UserId = @userId'); req.input('userId', q.userId); }
  if (q.from) { where.push('a.CreatedAt >= @from'); req.input('from', q.from); }
  if (q.to) { where.push('a.CreatedAt < @to'); req.input('to', q.to); }

  const result = await req.query(`
    SELECT TOP (@limit)
      a.Id, a.EntityType, a.EntityId, a.Action, a.UserId, u.Email AS UserEmail, u.Name AS UserName,
      a.OldValue, a.NewValue, a.Description, a.IpAddress, a.CreatedAt
    FROM AuditLog a
    LEFT JOIN Users u ON u.Id = a.UserId
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY a.CreatedAt DESC, a.Id DESC
  `);

  return result.recordset.map((row: Record<string, unknown>) => ({
    ...row,
    oldValue: safeJson(row.OldValue),
    newValue: safeJson(row.NewValue),
  }));
}

function safeJson(v: unknown): unknown {
  if (typeof v !== 'string' || !v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}
