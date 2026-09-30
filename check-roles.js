const sql = require('mssql');

const config = {
  server: '10.100.0.20',
  port: 1433,
  database: 'GPCLFinanceResource',
  authentication: { type: 'default', options: { userName: 'sa', password: 'system@123' } },
  options: { encrypt: false, trustServerCertificate: true }
};

async function check() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database');

    // Check if Roles table exists
    const tableCheck = await pool.request().query(\SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Roles'\);
    if (tableCheck.recordset.length === 0) {
      console.log('❌ Roles table does NOT exist'); 
    } else {
      console.log('✅ Roles table exists');
    }

    // Get columns
    const columns = await pool.request().query(\SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Roles'\);
    console.log('Columns: ' + columns.recordset.map(c => c.COLUMN_NAME + ':' + c.DATA_TYPE).join(', '));

    // Count roles
    const roleCount = await pool.request().query('SELECT COUNT(*) as cnt FROM Roles');
    console.log('Total roles in DB: ' + roleCount.recordset[0].cnt);

    await pool.close();
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

check();
