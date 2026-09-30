const sql = require('mssql');
const config = {
  server: '10.100.0.20', port: 1433, database: 'GPCLFinanceResource',
  user: 'sa', password: 'system@123',
  options: { encrypt: false, trustServerCertificate: true }
};
async function run() {
  const pool = await sql.connect(config);
  console.log('Connected.');
  const tablesResult = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
  console.log('Existing tables:');
  tablesResult.recordset.forEach(r => console.log(' -', r.TABLE_NAME));
  const exists = tablesResult.recordset.some(r => r.TABLE_NAME === 'RolePermissions');
  if (exists) {
    const rows = await pool.request().query('SELECT COUNT(*) AS cnt FROM RolePermissions');
    console.log('RolePermissions already exists, rows:', rows.recordset[0].cnt);
  } else {
    console.log('Creating RolePermissions table...');
    await pool.request().query("CREATE TABLE RolePermissions (Id INT IDENTITY(1,1) PRIMARY KEY, RoleName NVARCHAR(100) NOT NULL, PermissionId NVARCHAR(100) NOT NULL, CreatedAt DATETIME DEFAULT GETDATE(), CONSTRAINT UQ_RolePermissions UNIQUE (RoleName, PermissionId))");
    const seeds = [
      ['ADMIN','accounting.view'],['ADMIN','accounting.journal.post'],['ADMIN','accounting.journal.reverse'],['ADMIN','accounting.period.close'],['ADMIN','accounting.budget.view'],['ADMIN','accounting.budget.create'],['ADMIN','finance.invoices.view'],['ADMIN','finance.invoices.create'],['ADMIN','finance.payments.view'],['ADMIN','finance.payments.create'],['ADMIN','finance.clients.view'],['ADMIN','finance.clients.create'],['ADMIN','finance.clients.update'],['ADMIN','finance.clients.delete'],['ADMIN','reconciliation.manage'],['ADMIN','accounting.audit.view'],['ADMIN','admin.roles.manage'],
      ['SENIOR_ACCOUNTANT','accounting.view'],['SENIOR_ACCOUNTANT','accounting.journal.post'],['SENIOR_ACCOUNTANT','accounting.journal.reverse'],['SENIOR_ACCOUNTANT','accounting.period.close'],['SENIOR_ACCOUNTANT','accounting.budget.view'],['SENIOR_ACCOUNTANT','accounting.budget.create'],['SENIOR_ACCOUNTANT','finance.invoices.view'],['SENIOR_ACCOUNTANT','finance.invoices.create'],['SENIOR_ACCOUNTANT','finance.payments.view'],['SENIOR_ACCOUNTANT','finance.payments.create'],['SENIOR_ACCOUNTANT','finance.clients.view'],['SENIOR_ACCOUNTANT','finance.clients.create'],['SENIOR_ACCOUNTANT','finance.clients.update'],['SENIOR_ACCOUNTANT','reconciliation.manage'],
      ['ACCOUNTS_RECEIVABLE_CLERK','finance.invoices.view'],['ACCOUNTS_RECEIVABLE_CLERK','finance.invoices.create'],['ACCOUNTS_RECEIVABLE_CLERK','finance.payments.view'],['ACCOUNTS_RECEIVABLE_CLERK','finance.payments.create'],['ACCOUNTS_RECEIVABLE_CLERK','finance.clients.view'],
      ['AUDITOR','accounting.view'],['AUDITOR','accounting.budget.view'],['AUDITOR','finance.invoices.view'],['AUDITOR','finance.payments.view'],['AUDITOR','finance.clients.view'],['AUDITOR','accounting.audit.view']
    ];
    for (const [r, p] of seeds) { await pool.request().input('r',r).input('p',p).query('INSERT INTO RolePermissions (RoleName,PermissionId) VALUES (@r,@p)'); }
    const verify = await pool.request().query('SELECT RoleName, COUNT(*) AS cnt FROM RolePermissions GROUP BY RoleName ORDER BY RoleName');
    console.log('Seeded permissions:');
    verify.recordset.forEach(r => console.log(' -', r.RoleName + ':', r.cnt, 'permissions'));
  }
  await sql.close();
  console.log('Done.');
}
run().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
