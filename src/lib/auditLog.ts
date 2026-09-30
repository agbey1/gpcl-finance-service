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

/**
 * Get audit log entries for an entity
 */
export async function getAuditLog(
  entityType: string,
  entityId: string | number,
  limit: number = 50
): Promise<any[]> {
  try {
    const db = await getDb();

    const result = await db.request()
      .input('entityType', entityType)
      .input('entityId', entityId.toString())
      .input('limit', limit)
      .query(`
        SELECT TOP (@limit)
          Id,
          EntityType,
          EntityId,
          Action,
          UserId,
          OldValue,
          NewValue,
          Description,
          IpAddress,
          CreatedAt
        FROM AuditLog
        WHERE EntityType = @entityType AND EntityId = @entityId
        ORDER BY CreatedAt DESC
      `);

    return result.recordset.map((row: any) => ({
      ...row,
      oldValue: row.OldValue ? JSON.parse(row.OldValue) : null,
      newValue: row.NewValue ? JSON.parse(row.NewValue) : null,
    }));
  } catch (err: any) {
    logger.error('Failed to retrieve audit log', { error: err.message });
    return [];
  }
}

/**
 * Get audit log entries for a date range
 */
export async function getAuditLogByDateRange(
  startDate: Date,
  endDate: Date,
  limit: number = 100
): Promise<any[]> {
  try {
    const db = await getDb();

    const result = await db.request()
      .input('startDate', startDate)
      .input('endDate', endDate)
      .input('limit', limit)
      .query(`
        SELECT TOP (@limit)
          Id,
          EntityType,
          EntityId,
          Action,
          UserId,
          OldValue,
          NewValue,
          Description,
          IpAddress,
          CreatedAt
        FROM AuditLog
        WHERE CreatedAt BETWEEN @startDate AND @endDate
        ORDER BY CreatedAt DESC
      `);

    return result.recordset.map((row: any) => ({
      ...row,
      oldValue: row.OldValue ? JSON.parse(row.OldValue) : null,
      newValue: row.NewValue ? JSON.parse(row.NewValue) : null,
    }));
  } catch (err: any) {
    logger.error('Failed to retrieve audit log by date range', { error: err.message });
    return [];
  }
}

/**
 * Get audit log by user
 */
export async function getAuditLogByUser(
  userId: number,
  limit: number = 50
): Promise<any[]> {
  try {
    const db = await getDb();

    const result = await db.request()
      .input('userId', userId)
      .input('limit', limit)
      .query(`
        SELECT TOP (@limit)
          Id,
          EntityType,
          EntityId,
          Action,
          UserId,
          OldValue,
          NewValue,
          Description,
          IpAddress,
          CreatedAt
        FROM AuditLog
        WHERE UserId = @userId
        ORDER BY CreatedAt DESC
      `);

    return result.recordset.map((row: any) => ({
      ...row,
      oldValue: row.OldValue ? JSON.parse(row.OldValue) : null,
      newValue: row.NewValue ? JSON.parse(row.NewValue) : null,
    }));
  } catch (err: any) {
    logger.error('Failed to retrieve audit log by user', { error: err.message });
    return [];
  }
}
