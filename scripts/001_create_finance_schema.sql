-- ============================================================================
-- GPCL Standalone Finance Service - Database Schema Definition
-- Database: gpcl_finance_db
-- Target RDBMS: Microsoft SQL Server 2019+
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'gpcl_finance_db')
BEGIN
    CREATE DATABASE gpcl_finance_db;
END
GO

USE gpcl_finance_db;
GO

-- 1. Chart of Accounts Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Accounts' AND xtype='U')
BEGIN
    CREATE TABLE Accounts (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Code VARCHAR(20) NOT NULL UNIQUE,
        Name NVARCHAR(150) NOT NULL,
        Type VARCHAR(20) NOT NULL CHECK (Type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
        IsControl BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_Accounts_Code ON Accounts(Code);
    CREATE INDEX IX_Accounts_Type ON Accounts(Type);
END
GO

-- 2. Financial Periods Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FinancialPeriods' AND xtype='U')
BEGIN
    CREATE TABLE FinancialPeriods (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FinancialYear INT NOT NULL UNIQUE,
        StartDate DATE NOT NULL,
        EndDate DATE NOT NULL,
        Status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (Status IN ('OPEN', 'CLOSED', 'PROCESSING')),
        ClosedAt DATETIME2 NULL,
        ClosedBy INT NULL
    );
    CREATE INDEX IX_FinancialPeriods_Year ON FinancialPeriods(FinancialYear);
END
GO

-- 3. Journal Entries Header Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='JournalEntries' AND xtype='U')
BEGIN
    CREATE TABLE JournalEntries (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EntryNumber VARCHAR(30) NOT NULL UNIQUE,
        EntryDate DATE NOT NULL,
        Description NVARCHAR(500) NOT NULL,
        Reference VARCHAR(100) NULL,
        SourceModule VARCHAR(50) NOT NULL,
        SourceId VARCHAR(100) NOT NULL,
        Status VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (Status IN ('POSTED', 'REVERSED')),
        ReversalOfId INT NULL REFERENCES JournalEntries(Id),
        PostedBy INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_JournalEntries_EntryNumber ON JournalEntries(EntryNumber);
    CREATE INDEX IX_JournalEntries_EntryDate ON JournalEntries(EntryDate);
    CREATE INDEX IX_JournalEntries_Source ON JournalEntries(SourceModule, SourceId);
END
GO

-- 4. Journal Entry Lines Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='JournalEntryLines' AND xtype='U')
BEGIN
    CREATE TABLE JournalEntryLines (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        JournalEntryId INT NOT NULL REFERENCES JournalEntries(Id) ON DELETE CASCADE,
        AccountId INT NOT NULL REFERENCES Accounts(Id),
        BranchId INT NULL,
        Description NVARCHAR(250) NULL,
        Debit DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
        Credit DECIMAL(18,4) NOT NULL DEFAULT 0.0000
    );
    CREATE INDEX IX_JournalEntryLines_EntryId ON JournalEntryLines(JournalEntryId);
    CREATE INDEX IX_JournalEntryLines_AccountId ON JournalEntryLines(AccountId);
END
GO

-- 5. Invoices Table (Accounts Receivable)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Invoices' AND xtype='U')
BEGIN
    CREATE TABLE Invoices (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InvoiceNumber VARCHAR(30) NOT NULL UNIQUE,
        ClientId INT NOT NULL,
        InvoiceDate DATE NOT NULL,
        DueDate DATE NOT NULL,
        SubTotal DECIMAL(18,2) NOT NULL,
        VatAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        NhisAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        GetfundAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        TotalAmount DECIMAL(18,2) NOT NULL,
        BalanceDue DECIMAL(18,2) NOT NULL,
        Status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (Status IN ('UNPAID', 'PARTIAL', 'PAID', 'VOID', 'CANCELLED')),
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_Invoices_InvoiceNumber ON Invoices(InvoiceNumber);
    CREATE INDEX IX_Invoices_ClientId ON Invoices(ClientId);
    CREATE INDEX IX_Invoices_Status ON Invoices(Status);
END
GO

-- 6. Payments Table (Accounts Receivable Settlements)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Payments' AND xtype='U')
BEGIN
    CREATE TABLE Payments (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PaymentNumber VARCHAR(30) NOT NULL UNIQUE,
        ClientId INT NOT NULL,
        PaymentDate DATE NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        PaymentMethod VARCHAR(30) NOT NULL CHECK (PaymentMethod IN ('CASH', 'CHEQUE', 'BANK_TRANSFER', 'MOMO')),
        Reference VARCHAR(100) NULL,
        BankAccountId INT NULL,
        ClearedDate DATE NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_Payments_PaymentNumber ON Payments(PaymentNumber);
    CREATE INDEX IX_Payments_ClientId ON Payments(ClientId);
END
GO

-- 7. Credit Notes Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CreditNotes' AND xtype='U')
BEGIN
    CREATE TABLE CreditNotes (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CreditNoteNumber VARCHAR(30) NOT NULL UNIQUE,
        ClientId INT NOT NULL,
        IssueDate DATE NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        AmountApplied DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Reason NVARCHAR(250) NOT NULL,
        Status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (Status IN ('OPEN', 'PARTIALLY_APPLIED', 'FULLY_APPLIED', 'VOID')),
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_CreditNotes_ClientId ON CreditNotes(ClientId);
    CREATE INDEX IX_CreditNotes_Status ON CreditNotes(Status);
END
GO

-- 8. Bank Accounts Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BankAccounts' AND xtype='U')
BEGIN
    CREATE TABLE BankAccounts (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AccountNumber VARCHAR(50) NOT NULL UNIQUE,
        BankName NVARCHAR(100) NOT NULL,
        AccountHolderName NVARCHAR(150) NOT NULL,
        Currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
        GLAccountId INT NOT NULL REFERENCES Accounts(Id),
        BranchId INT NULL,
        IsActive BIT NOT NULL DEFAULT 1
    );
    CREATE INDEX IX_BankAccounts_AccountNumber ON BankAccounts(AccountNumber);
END
GO

-- 9. Bank Statements Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BankStatements' AND xtype='U')
BEGIN
    CREATE TABLE BankStatements (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BankAccountId INT NOT NULL REFERENCES BankAccounts(Id),
        Filename NVARCHAR(255) NOT NULL,
        UploadDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        StartDate DATE NOT NULL,
        EndDate DATE NOT NULL,
        UploadedBy INT NOT NULL
    );
    CREATE INDEX IX_BankStatements_BankAccountId ON BankStatements(BankAccountId);
END
GO

-- 10. Bank Transactions Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BankTransactions' AND xtype='U')
BEGIN
    CREATE TABLE BankTransactions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BankStatementId INT NOT NULL REFERENCES BankStatements(Id),
        TransactionDate DATE NOT NULL,
        ValueDate DATE NULL,
        Description NVARCHAR(500) NOT NULL,
        Reference VARCHAR(100) NULL,
        Debit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Credit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Balance DECIMAL(18,2) NULL,
        MatchingStatus VARCHAR(20) NOT NULL DEFAULT 'UNMATCHED' CHECK (MatchingStatus IN ('UNMATCHED', 'PENDING_REVIEW', 'CLEARED')),
        MatchedPaymentId INT NULL REFERENCES Payments(Id)
    );
    CREATE INDEX IX_BankTransactions_StatementId ON BankTransactions(BankStatementId);
    CREATE INDEX IX_BankTransactions_MatchingStatus ON BankTransactions(MatchingStatus);
END
GO

-- 11. Reconciliation Variances Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ReconciliationVariances' AND xtype='U')
BEGIN
    CREATE TABLE ReconciliationVariances (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BankAccountId INT NOT NULL REFERENCES BankAccounts(Id),
        VarianceType VARCHAR(50) NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Description NVARCHAR(250) NOT NULL,
        BankTransactionId INT NULL REFERENCES BankTransactions(Id),
        PaymentId INT NULL REFERENCES Payments(Id),
        GLJournalEntryId INT NULL REFERENCES JournalEntries(Id),
        ResolvedAt DATETIME2 NULL,
        ResolvedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_ReconciliationVariances_BankAccountId ON ReconciliationVariances(BankAccountId);
END
GO

-- 12. Statutory PAYE & WHT Tables
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PAYEBands' AND xtype='U')
BEGIN
    CREATE TABLE PAYEBands (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EffectiveYear INT NOT NULL,
        BandOrder INT NOT NULL,
        LowerInclusive DECIMAL(18,2) NOT NULL,
        UpperExclusive DECIMAL(18,2) NULL,
        Rate DECIMAL(6,4) NOT NULL
    );
    CREATE INDEX IX_PAYEBands_Year ON PAYEBands(EffectiveYear, BandOrder);
END
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WHTRates' AND xtype='U')
BEGIN
    CREATE TABLE WHTRates (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EffectiveYear INT NOT NULL,
        PayeeType VARCHAR(50) NOT NULL,
        Description NVARCHAR(200) NOT NULL,
        Rate DECIMAL(6,4) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1
    );
    CREATE INDEX IX_WHTRates_Year ON WHTRates(EffectiveYear, PayeeType);
END
GO
