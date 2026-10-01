/**
 * Every permission the API checks, with UI labels. Shared by the Roles screen
 * and by role validation (unknown permission IDs are rejected).
 */
export interface PermissionDef {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { id: 'accounting.view', name: 'View General Ledger', description: 'View Chart of Accounts, balances and financial reports', category: 'Accounting' },
  { id: 'accounting.journal.view', name: 'View Journal Entries', description: 'View journal entries and their lines', category: 'Accounting' },
  { id: 'accounting.journal.post', name: 'Post Journal Entries', description: 'Post manual double-entry journals (vouchers)', category: 'Accounting' },
  { id: 'accounting.journal.reverse', name: 'Reverse Journals', description: 'Reverse posted manual journals with audit trail', category: 'Accounting' },
  { id: 'accounting.accounts.create', name: 'Create Accounts', description: 'Add accounts to the Chart of Accounts', category: 'Accounting' },
  { id: 'accounting.accounts.update', name: 'Update Accounts', description: 'Edit or deactivate accounts in the Chart of Accounts', category: 'Accounting' },
  { id: 'accounting.period.close', name: 'Close Financial Periods', description: 'Close accounting months (re-opening is Super Administrator only)', category: 'Accounting' },
  { id: 'accounting.period.force_close', name: 'Force-close Periods', description: 'Close a month even if its ledger does not balance', category: 'Accounting' },
  { id: 'accounting.budget.view', name: 'View Budgets', description: 'View budgets and variance analysis', category: 'Accounting' },
  { id: 'accounting.budget.create', name: 'Create Budgets', description: 'Create and manage budgets', category: 'Accounting' },
  { id: 'finance.invoices.view', name: 'View Invoices', description: 'View customer invoices and AR balances', category: 'Invoicing & AR' },
  { id: 'finance.invoices.create', name: 'Create Invoices', description: 'Issue customer invoices with Ghana statutory levies', category: 'Invoicing & AR' },
  { id: 'finance.invoices.void', name: 'Void Invoices', description: 'Void unpaid invoices (reverses revenue and levies)', category: 'Invoicing & AR' },
  { id: 'finance.creditnotes.create', name: 'Issue Credit Notes', description: 'Issue credit notes against customer invoices', category: 'Invoicing & AR' },
  { id: 'finance.payments.view', name: 'View Payments', description: 'View payment records and history', category: 'Invoicing & AR' },
  { id: 'finance.payments.create', name: 'Record Payments', description: 'Record customer receipts and settle invoices', category: 'Invoicing & AR' },
  { id: 'finance.payments.reverse', name: 'Reverse Payments', description: 'Reverse a recorded customer payment (restores the invoice balance)', category: 'Invoicing & AR' },
  { id: 'finance.clients.view', name: 'View Clients', description: 'View client information and credit limits', category: 'Invoicing & AR' },
  { id: 'finance.clients.create', name: 'Create Clients', description: 'Create new client accounts', category: 'Invoicing & AR' },
  { id: 'finance.clients.update', name: 'Update Clients', description: 'Modify client information', category: 'Invoicing & AR' },
  { id: 'finance.clients.delete', name: 'Delete Clients', description: 'Deactivate client accounts', category: 'Invoicing & AR' },
  { id: 'reconciliation.view', name: 'View Bank Reconciliation', description: 'View bank accounts and statement lines', category: 'Banking' },
  { id: 'reconciliation.manage', name: 'Manage Bank Reconciliation', description: 'Upload statements and match bank transactions', category: 'Banking' },
  { id: 'accounting.audit.view', name: 'View Audit Logs', description: 'View the audit trail of all system changes', category: 'Administration' },
  { id: 'admin.users.manage', name: 'Manage Users', description: 'Create users, assign roles and reset passwords', category: 'Administration' },
  { id: 'admin.roles.manage', name: 'Manage Roles & Settings', description: 'Create roles, assign permissions and change system settings', category: 'Administration' },
];

export const PERMISSION_IDS = new Set(PERMISSIONS.map((p) => p.id));

/** Built-in roles: stored in the Roles table under these keys, shown with these labels. */
export const SYSTEM_ROLES: Record<string, { label: string; description: string }> = {
  ADMIN: { label: 'Finance Administrator', description: 'Full administrative access to all financial modules and RBAC management.' },
  SENIOR_ACCOUNTANT: { label: 'Senior Accountant', description: 'Posts journals, manages invoices, records payments and closes periods.' },
  ACCOUNTS_RECEIVABLE_CLERK: { label: 'AR Clerk', description: 'Creates customer invoices and records payment receipts.' },
  AUDITOR: { label: 'Financial Auditor', description: 'Read-only access to the General Ledger and financial reports.' },
};

/** Not stored in Roles: implicit full access, assigned only via create-admin or by another Super Administrator. */
export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

export const roleLabel = (key: string): string =>
  key === SUPER_ADMIN_ROLE ? 'Super Administrator' : SYSTEM_ROLES[key]?.label ?? key;
