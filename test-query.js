const sql = require('mssql');

const config = {
  server: '10.100.0.20',
  database: 'GPCLFinanceResource',
  user: 'sa',
  password: 'system@123',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function test() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database');

    const skip = 0;
    const take = 20;

    // Test 1: With .input()
    console.log('\nTest 1: With .input() parameters');
    try {
      const result1 = await pool.request()
        .input('skip', skip)
        .input('take', take)
        .query(`
          SELECT Id, Name FROM Clients
          WHERE IsActive = 1
          ORDER BY Name ASC
          OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
        `);
      console.log(`✅ SUCCESS: ${result1.recordset.length} records`);
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
    }

    // Test 2: Simple query without parameters
    console.log('\nTest 2: Simple query without parameters');
    try {
      const result2 = await pool.request().query(`SELECT COUNT(*) as cnt FROM Clients`);
      console.log(`✅ SUCCESS: ${result2.recordset[0].cnt} clients`);
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
    }

    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
