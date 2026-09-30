const sql = require('mssql');
const config = { server: '10.100.0.13', port: 1433, database: 'GPCLFinanceResource', user: 'sa', password: 'system@123', options: { encrypt: false, trustServerCertificate: true } };
sql.connect(config).then(async pool => {
  // JournalEntryLines columns
  const r1 = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'JournalEntryLines' ORDER BY ORDINAL_POSITION");
  console.log('JournalEntryLines columns:');
  r1.recordset.forEach(c => console.log(' -', c.COLUMN_NAME, ':', c.DATA_TYPE));
  // Clients full column list
  const r2 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Clients' ORDER BY ORDINAL_POSITION");
  console.log('Clients columns:', r2.recordset.map(c => c.COLUMN_NAME).join(', '));
  await sql.close(); process.exit(0);
}).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
