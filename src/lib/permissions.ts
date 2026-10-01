import { logger } from './logger';

/**
 * Built-in permission sets, used only when the RolePermissions table has no
 * rows for a role (e.g. before migration 004 has been applied). Once roles are
 * managed through /api/v1/roles, the database is authoritative.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'accounting.view',
    'accounting.journal.view',
    'accounting.journal.post',
    'accounting.journal.reverse',
    'accounting.period.close',
    'accounting.accounts.create',
    'accounting.accounts.update',
    'accounting.budget.view',
    'accounting.budget.create',
    'accounting.audit.view',
    'finance.invoices.view',
    'finance.invoices.create',
    'finance.invoices.void',
    'finance.payments.view',
    'finance.payments.create',
    'finance.payments.reverse',
    'finance.clients.view',
    'finance.clients.create',
    'finance.clients.update',
    'finance.clients.delete',
    'finance.creditnotes.create',
    'reconciliation.view',
    'reconciliation.manage',
    'admin.roles.manage',
    'admin.users.manage',
  ],
  SENIOR_ACCOUNTANT: [
    'accounting.view',
    'accounting.journal.view',
    'accounting.journal.post',
    'accounting.journal.reverse',
    'accounting.period.close',
    'accounting.budget.view',
    'accounting.audit.view',
    'finance.invoices.view',
    'finance.invoices.create',
    'finance.invoices.void',
    'finance.payments.view',
    'finance.payments.create',
    'finance.payments.reverse',
    'finance.clients.view',
    'reconciliation.view',
    'reconciliation.manage',
  ],
  ACCOUNTS_RECEIVABLE_CLERK: [
    'finance.invoices.view',
    'finance.invoices.create',
    'finance.payments.view',
    'finance.payments.create',
    'finance.clients.view',
  ],
  AUDITOR: [
    'accounting.view',
    'accounting.journal.view',
    'accounting.audit.view',
    'finance.invoices.view',
    'finance.payments.view',
    'finance.clients.view',
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mssql pool
export async function loadRolePermissions(db: any, role: string): Promise<string[]> {
  try {
    const r = await db
      .request()
      .input('role', role)
      .query('SELECT PermissionId FROM RolePermissions WHERE RoleName = @role');
    if (r.recordset.length > 0) {
      return r.recordset.map((row: { PermissionId: string }) => row.PermissionId);
    }
  } catch (err) {
    logger.warn('RolePermissions lookup failed; using built-in defaults', {
      role,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  // Unknown roles get no permissions rather than silently inheriting another role's.
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}
