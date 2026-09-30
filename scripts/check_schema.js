const sql = require('mssql');
const config = { server: '10.100.0.13', port: 1433, database: 'GPCLFinanceResource', user: 'sa', password: 'system@123', options: { encrypt: false, trustServerCertificate: true } };
sql.connect(config).then(async pool => {
  const r1 = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'JournalEntries' ORDER BY ORDINAL_POSITION");
  console.log('JournalEntries columns:');
  r1.recordset.forEach(c => console.log(' -', c.COLUMN_NAME, ':', c.DATA_TYPE));
  const r2 = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Clients' ORDER BY ORDINAL_POSITION");
  console.log('Clients columns:');
  r2.recordset.forEach(c => console.log(' -', c.COLUMN_NAME, ':', c.DATA_TYPE));
  // Check if JournalEntryLines exists
  const r3 = await pool.request().query("SELECT TOP 1 * FROM JournalEntryLines");
  console.log('JournalEntryLines sample columns:', Object.keys(r3.recordset[0] || {}));
  await sql.close(); process.exit(0);
}).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
