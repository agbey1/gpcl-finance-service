const sql = require('mssql');
const config = { server: '10.100.0.13', port: 1433, database: 'GPCLFinanceResource', user: 'sa', password: 'system@123', options: { encrypt: false, trustServerCertificate: true } };
sql.connect(config).then(async pool => {
  const r = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ChartOfAccounts' ORDER BY ORDINAL_POSITION");
  console.log('ChartOfAccounts columns:');
  r.recordset.forEach(c => console.log(' -', c.COLUMN_NAME, ':', c.DATA_TYPE));
  const sample = await pool.request().query("SELECT TOP 3 * FROM ChartOfAccounts");
  console.log('Sample rows:', JSON.stringify(sample.recordset, null, 2));
  await sql.close(); process.exit(0);
}).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
