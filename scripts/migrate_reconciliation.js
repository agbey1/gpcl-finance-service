const sql = require('mssql');

async function migrate(server) {
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
    console.log('Connected to ' + server);

    await pool.request().query(
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BankStatements')
      CREATE TABLE BankStatements (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BankAccountId INT NOT NULL,
        Filename NVARCHAR(255) NOT NULL,
        StatementPeriod NVARCHAR(50) NULL,
        UploadedBy INT NOT NULL DEFAULT 1,
        UploadedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        TotalLines INT NOT NULL DEFAULT 0
      );
    );

    await pool.request().query(
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BankStatementLines')
      CREATE TABLE BankStatementLines (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StatementId INT NOT NULL,
        BankAccountId INT NOT NULL,
        TxnDate DATETIME2 NULL,
        ValueDate DATETIME2 NULL,
        Description NVARCHAR(500) NOT NULL,
        Reference NVARCHAR(100) NULL,
        Debit DECIMAL(18,2) NOT NULL DEFAULT 0,
        Credit DECIMAL(18,2) NOT NULL DEFAULT 0,
        Balance DECIMAL(18,2) NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'UNMATCHED',
        MatchedPaymentId INT NULL,
        MatchedJournalLineId INT NULL,
        MatchedPaymentRef NVARCHAR(100) NULL,
        MatchedAt DATETIME2 NULL,
        MatchedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
      );
    );

    await pool.request().query(
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReconciliationMatches')
      CREATE TABLE ReconciliationMatches (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StatementLineId INT NOT NULL,
        PaymentId INT NULL,
        JournalEntryLineId INT NULL,
        MatchScore DECIMAL(5,2) NOT NULL DEFAULT 100.00,
        MatchType NVARCHAR(50) NOT NULL DEFAULT 'AUTO',
        MatchedAt DATETIME2 NOT NULL DEFAULT GETDATE()
      );
    );

    console.log('Bank Reconciliation tables created successfully on ' + server);
    await sql.close();
  } catch (err) {
    console.error('Error on ' + server + ':', err.message);
  }
}

async function main() {
  await migrate('10.100.0.13');
  await migrate('10.100.0.20');
}

main();
