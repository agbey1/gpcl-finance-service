const sql = require('mssql');

const servers = ['10.100.0.13', '10.100.0.20'];

async function migrateClients(server) {
  const config = {
    server,
    port: 1433,
    database: 'GPCLFinanceResource',
    user: 'sa',
    password: 'system@123',
    options: { encrypt: false, trustServerCertificate: true, connectTimeout: 10000 }
  };

  try {
    const pool = await sql.connect(config);
    console.log(Connected to );

    await pool.request().query(
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Clients') AND name = 'Address')
        ALTER TABLE Clients ADD Address NVARCHAR(255) NULL;

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Clients') AND name = 'TaxId')
        ALTER TABLE Clients ADD TaxId NVARCHAR(50) NULL;

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Clients') AND name = 'IsActive')
        ALTER TABLE Clients ADD IsActive BIT NOT NULL DEFAULT 1;

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Clients') AND name = 'UpdatedAt')
        ALTER TABLE Clients ADD UpdatedAt DATETIME2 NULL;
    );

    await pool.request().query(UPDATE Clients SET IsActive = 1 WHERE IsActive IS NULL;);
    await pool.request().query(UPDATE Clients SET UpdatedAt = GETDATE() WHERE UpdatedAt IS NULL;);

    console.log(Clients schema updated on );
    await sql.close();
  } catch (err) {
    console.error(Error on :, err.message);
  }
}

async function run() {
  for (const server of servers) {
    await migrateClients(server);
  }
}

run();
