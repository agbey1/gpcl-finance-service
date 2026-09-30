-- Migration 006: Bank Reconciliation Schema
-- Creates tables for bank statement uploads, reconciliation matching, and audit trail

-- 1. BankAccounts Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BankAccounts')
BEGIN
    CREATE TABLE BankAccounts (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AccountName NVARCHAR(255) NOT NULL,
        AccountNumber NVARCHAR(50) NOT NULL UNIQUE,
        BankName NVARCHAR(255) NOT NULL,
        GLAccountCode NVARCHAR(20) NOT NULL,
        Currency NVARCHAR(3) NOT NULL DEFAULT 'GHS',
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_BankAccounts_GLAccount FOREIGN KEY(GLAccountCode) REFERENCES ChartOfAccounts(AccountCode)
    );
    CREATE INDEX IX_BankAccounts_IsActive ON BankAccounts(IsActive);
    PRINT 'Created BankAccounts table';
END;

-- 2. BankStatements Table (Header/Summary)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BankStatements')
BEGIN
    CREATE TABLE BankStatements (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BankAccountId INT NOT NULL,
        StatementDate DATE NOT NULL,
        StartBalance DECIMAL(18,2) NOT NULL,
        EndBalance DECIMAL(18,2) NOT NULL,
        TotalDebits DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalCredits DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalLines INT NOT NULL DEFAULT 0,
        MatchedLines INT NOT NULL DEFAULT 0,
        UnmatchedLines INT NOT NULL DEFAULT 0,
        UploadedBy INT NOT NULL,
        UploadedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        Status NVARCHAR(20) NOT NULL DEFAULT 'UPLOADED', -- UPLOADED, RECONCILED, PARTIAL
        Filename NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_BankStatements_BankAccount FOREIGN KEY(BankAccountId) REFERENCES BankAccounts(Id),
        CONSTRAINT FK_BankStatements_User FOREIGN KEY(UploadedBy) REFERENCES Users(Id),
        CONSTRAINT UQ_BankStatement_Date UNIQUE(BankAccountId, StatementDate)
    );
    CREATE INDEX IX_BankStatements_Date ON BankStatements(StatementDate DESC);
    CREATE INDEX IX_BankStatements_Status ON BankStatements(Status);
    PRINT 'Created BankStatements table';
END;

-- 3. BankStatementLines Table (Individual Transactions)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BankStatementLines')
BEGIN
    CREATE TABLE BankStatementLines (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BankStatementId INT NOT NULL,
        SequenceNumber INT NOT NULL,
        TransactionDate DATE NOT NULL,
        ValueDate DATE NOT NULL,
        Description NVARCHAR(500) NOT NULL,
        Reference NVARCHAR(100) NULL,
        Debit DECIMAL(18,2) NOT NULL DEFAULT 0,
        Credit DECIMAL(18,2) NOT NULL DEFAULT 0,
        Balance DECIMAL(18,2) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'UNMATCHED', -- UNMATCHED, CLEARED, VARIANCE
        MatchedPaymentRef NVARCHAR(100) NULL, -- References Payment.PaymentNumber or JournalEntry.EntryNumber
        MatchedAt DATETIME2 NULL,
        MatchedBy INT NULL,
        VarianceReason NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_BankStatementLines_Statement FOREIGN KEY(BankStatementId) REFERENCES BankStatements(Id) ON DELETE CASCADE,
        CONSTRAINT FK_BankStatementLines_MatchedBy FOREIGN KEY(MatchedBy) REFERENCES Users(Id)
    );
    CREATE INDEX IX_BankStatementLines_Status ON BankStatementLines(Status);
    CREATE INDEX IX_BankStatementLines_Reference ON BankStatementLines(Reference);
    CREATE INDEX IX_BankStatementLines_Date ON BankStatementLines(TransactionDate DESC);
    CREATE INDEX IX_BankStatementLines_Amount ON BankStatementLines(Debit, Credit);
    PRINT 'Created BankStatementLines table';
END;

-- 4. ReconciliationMatches Table (Audit Trail)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReconciliationMatches')
BEGIN
    CREATE TABLE ReconciliationMatches (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BankStatementLineId INT NOT NULL,
        MatchStrategy NVARCHAR(50) NOT NULL, -- AUTO_PAYMENT, AUTO_JOURNAL, MANUAL
        MatchedEntityType NVARCHAR(50) NOT NULL, -- PAYMENT, JOURNALENTRY
        MatchedEntityId INT NOT NULL,
        MatchedReference NVARCHAR(100) NOT NULL,
        MatchedAmount DECIMAL(18,2) NOT NULL,
        MatchedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        MatchedBy INT NOT NULL,
        Notes NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_ReconciliationMatches_Line FOREIGN KEY(BankStatementLineId) REFERENCES BankStatementLines(Id) ON DELETE CASCADE,
        CONSTRAINT FK_ReconciliationMatches_User FOREIGN KEY(MatchedBy) REFERENCES Users(Id)
    );
    CREATE INDEX IX_ReconciliationMatches_Strategy ON ReconciliationMatches(MatchStrategy);
    CREATE INDEX IX_ReconciliationMatches_Reference ON ReconciliationMatches(MatchedReference);
    PRINT 'Created ReconciliationMatches table';
END;

-- 5. Insert default bank accounts (Ghana-specific)
IF NOT EXISTS (SELECT * FROM BankAccounts WHERE AccountNumber = '1002-GCB')
BEGIN
    INSERT INTO BankAccounts (AccountName, AccountNumber, BankName, GLAccountCode, Currency, IsActive) VALUES
    (N'GCB Bank - Operating Account', N'1002-GCB', N'Ghana Commercial Bank', N'1002', N'GHS', 1),
    (N'Ecobank - Operational Account', N'1003-ECOBANK', N'Ecobank Ghana', N'1003', N'GHS', 1);
    PRINT 'Inserted default bank accounts';
END;

PRINT 'Migration 006 completed successfully';
