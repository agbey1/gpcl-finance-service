-- Budget Tracking System Tables (SQL Server)
-- Migration 003: Add Budgets and BudgetLineItems tables

-- Budgets Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Budgets')
BEGIN
    CREATE TABLE Budgets (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BudgetName NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        Period NVARCHAR(20) NOT NULL, -- MONTHLY, QUARTERLY, ANNUAL
        FiscalYear INT NOT NULL,
        StartPeriod INT NOT NULL DEFAULT 1, -- 1-12 for the starting month
        Status NVARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, ACTIVE, CLOSED
        CreatedBy INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Budgets_Users FOREIGN KEY (CreatedBy) REFERENCES Users(Id),
        CONSTRAINT UQ_Budgets_Name_FY UNIQUE(BudgetName, FiscalYear)
    );

    -- Indexes for performance
    CREATE INDEX IX_Budgets_FiscalYear ON Budgets(FiscalYear);
    CREATE INDEX IX_Budgets_Status ON Budgets(Status);
    CREATE INDEX IX_Budgets_CreatedAt ON Budgets(CreatedAt DESC);
END;

-- BudgetLineItems Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BudgetLineItems')
BEGIN
    CREATE TABLE BudgetLineItems (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BudgetId INT NOT NULL,
        AccountCode NVARCHAR(20) NOT NULL,
        BudgetAmount DECIMAL(18,2) NOT NULL,
        Notes NVARCHAR(255) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_BudgetLineItems_Budgets FOREIGN KEY (BudgetId) REFERENCES Budgets(Id) ON DELETE CASCADE,
        CONSTRAINT FK_BudgetLineItems_ChartOfAccounts FOREIGN KEY (AccountCode) REFERENCES ChartOfAccounts(AccountCode),
        CONSTRAINT CK_BudgetLineItems_Amount CHECK (BudgetAmount >= 0)
    );

    -- Indexes for performance
    CREATE INDEX IX_BudgetLineItems_BudgetId ON BudgetLineItems(BudgetId);
    CREATE INDEX IX_BudgetLineItems_AccountCode ON BudgetLineItems(AccountCode);
END;
