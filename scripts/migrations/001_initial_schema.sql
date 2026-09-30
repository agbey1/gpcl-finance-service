-- GPCL Finance Service Complete Production Migration DDL (SQL Server)

-- 1. Users Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        Name NVARCHAR(255) NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Role NVARCHAR(50) NOT NULL DEFAULT 'ADMIN',
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END;

-- 2. Clients Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Clients')
BEGIN
    CREATE TABLE Clients (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NULL,
        Phone NVARCHAR(50) NULL,
        CreditLimit DECIMAL(18,2) NULL DEFAULT 50000.00,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END;

-- 3. Chart of Accounts Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChartOfAccounts')
BEGIN
    CREATE TABLE ChartOfAccounts (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AccountCode NVARCHAR(20) NOT NULL UNIQUE,
        AccountName NVARCHAR(255) NOT NULL,
        AccountType NVARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
        Category NVARCHAR(100) NULL,
        Code AS AccountCode,
        IsControl BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END;

-- Alias table for legacy Accounts queries
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'Accounts')
BEGIN
    EXEC('CREATE VIEW Accounts AS SELECT Id, AccountCode AS Code, AccountName, AccountType, Category, IsControl, IsActive FROM ChartOfAccounts;');
END;

-- 4. Financial Periods Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FinancialPeriods')
BEGIN
    CREATE TABLE FinancialPeriods (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FiscalYear INT NOT NULL,
        PeriodNumber INT NOT NULL,
        FinancialYear AS FiscalYear,
        IsClosed BIT NOT NULL DEFAULT 0,
        Status AS CASE WHEN IsClosed = 1 THEN 'CLOSED' ELSE 'OPEN' END,
        ClosedBy INT NULL,
        ClosedAt DATETIME2 NULL,
        Notes NVARCHAR(500) NULL,
        CONSTRAINT UQ_FinancialPeriods UNIQUE(FiscalYear, PeriodNumber)
    );
END;

-- 5. Invoices Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Invoices')
BEGIN
    CREATE TABLE Invoices (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InvoiceNumber NVARCHAR(50) NOT NULL UNIQUE,
        ClientId INT NOT NULL,
        ClientName NVARCHAR(255) NULL,
        InvoiceDate DATETIME2 NOT NULL,
        DueDate DATETIME2 NOT NULL,
        SubTotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        VatAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        NhisAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        GetfundAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        BalanceDue DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Status NVARCHAR(20) NOT NULL DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID, VOID
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END;

-- 6. Credit Notes Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CreditNotes')
BEGIN
    CREATE TABLE CreditNotes (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CreditNoteNumber NVARCHAR(50) NOT NULL UNIQUE,
        ClientId INT NOT NULL,
        InvoiceId INT NULL,
        CreditNoteDate DATETIME2 NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        AmountApplied DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Reason NVARCHAR(500) NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, APPLIED, REFUNDED
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END;

-- 7. Payments Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Payments')
BEGIN
    CREATE TABLE Payments (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PaymentNumber NVARCHAR(50) NOT NULL UNIQUE,
        ClientId INT NOT NULL,
        InvoiceId INT NULL,
        PaymentDate DATETIME2 NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        PaymentMethod NVARCHAR(50) NOT NULL,
        Reference NVARCHAR(100) NULL,
        BankAccountId INT NULL,
        RecordedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END;

-- 8. Journal Entries Header Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'JournalEntries')
BEGIN
    CREATE TABLE JournalEntries (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EntryNumber NVARCHAR(50) NOT NULL UNIQUE,
        EntryDate DATETIME2 NOT NULL,
        Description NVARCHAR(500) NOT NULL,
        Reference NVARCHAR(100) NULL,
        SourceModule NVARCHAR(50) NOT NULL,
        SourceId NVARCHAR(50) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'POSTED',
        ReversalOfId INT NULL,
        PostedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END;

-- 9. Journal Entry Lines Detail Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'JournalEntryLines')
BEGIN
    CREATE TABLE JournalEntryLines (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        JournalEntryId INT NOT NULL FOREIGN KEY REFERENCES JournalEntries(Id),
        AccountId INT NOT NULL FOREIGN KEY REFERENCES ChartOfAccounts(Id),
        BranchId INT NULL,
        Description NVARCHAR(500) NULL,
        Debit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Credit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END;

-- 10. Default Seed Data
-- No default user is seeded: create the first administrator with
--   npm run create-admin -- --email you@example.com --name "Your Name"

IF NOT EXISTS (SELECT * FROM ChartOfAccounts WHERE AccountCode = '1001')
BEGIN
    INSERT INTO ChartOfAccounts (AccountCode, AccountName, AccountType, Category, IsControl, IsActive) VALUES
    ('1001', 'Main Cash Account', 'ASSET', 'Cash', 0, 1),
    ('1002', 'GCB Bank - Operating Account', 'ASSET', 'Bank', 0, 1),
    ('1003', 'Ecobank - Operational Account', 'ASSET', 'Bank', 0, 1),
    ('1100', 'Trade Receivables (AR)', 'ASSET', 'Receivables', 1, 1),
    ('1201', 'Finished Goods Inventory', 'ASSET', 'Inventory', 1, 1),
    ('1202', 'Materials Store Inventory', 'ASSET', 'Inventory', 1, 1),
    ('2001', 'Accounts Payable (AP)', 'LIABILITY', 'Payables', 1, 1),
    ('2100', 'VAT Payable (15%)', 'LIABILITY', 'Tax', 0, 1),
    ('2102', 'NHIS Payable (2.5%)', 'LIABILITY', 'Tax', 0, 1),
    ('2103', 'GETFund Payable (2.5%)', 'LIABILITY', 'Tax', 0, 1),
    ('3001', 'Stated Capital', 'EQUITY', 'Equity', 0, 1),
    ('4001', 'Commercial Printing Revenue', 'REVENUE', 'Revenue', 0, 1),
    ('5001', 'Cost of Goods Sold (COGS)', 'EXPENSE', 'COGS', 0, 1),
    ('6100', 'Salaries & Wages Expense', 'EXPENSE', 'Operating', 0, 1);
END;

IF NOT EXISTS (SELECT * FROM Clients WHERE Name = 'Ghana Publishing Client A')
BEGIN
    INSERT INTO Clients (Name, Email, Phone, CreditLimit) VALUES
    ('Ghana Publishing Client A', 'clientA@gpcl.com', '+233240000001', 100000.00),
    ('Ministry of Information', 'info@moi.gov.gh', '+233302000002', 500000.00),
    ('State Transport Corporation', 'finance@stc.gov.gh', '+233302000003', 250000.00);
END;
