-- Migration 004: Add Roles and RolePermissions tables

-- 1. Roles Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE Roles (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Created Roles table';
END;

-- 2. RolePermissions Table (many-to-many mapping)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RolePermissions')
BEGIN
    CREATE TABLE RolePermissions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        RoleName NVARCHAR(100) NOT NULL,
        PermissionId NVARCHAR(100) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_RolePermissions UNIQUE(RoleName, PermissionId),
        CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY(RoleName) REFERENCES Roles(Name) ON DELETE CASCADE
    );
    PRINT 'Created RolePermissions table';
END;

-- 3. Insert default system roles
IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'ADMIN')
BEGIN
    INSERT INTO Roles (Name, Description) VALUES
    ('ADMIN', 'Finance Administrator - Full administrative access'),
    ('SENIOR_ACCOUNTANT', 'Senior Accountant - Post journals, manage invoices and payments'),
    ('ACCOUNTS_RECEIVABLE_CLERK', 'AR Clerk - Create invoices and record payments'),
    ('AUDITOR', 'Financial Auditor - Read-only access to GL and reports');
    PRINT 'Inserted default roles';
END;

-- 4. Populate RolePermissions for ADMIN (19 permissions)
IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleName = 'ADMIN')
BEGIN
    INSERT INTO RolePermissions (RoleName, PermissionId) VALUES
    ('ADMIN', 'accounting.view'),
    ('ADMIN', 'accounting.journal.post'),
    ('ADMIN', 'accounting.journal.reverse'),
    ('ADMIN', 'accounting.period.close'),
    ('ADMIN', 'accounting.budget.view'),
    ('ADMIN', 'accounting.budget.create'),
    ('ADMIN', 'accounting.audit.view'),
    ('ADMIN', 'finance.invoices.view'),
    ('ADMIN', 'finance.invoices.create'),
    ('ADMIN', 'finance.payments.view'),
    ('ADMIN', 'finance.payments.create'),
    ('ADMIN', 'finance.clients.view'),
    ('ADMIN', 'finance.clients.create'),
    ('ADMIN', 'finance.clients.update'),
    ('ADMIN', 'finance.clients.delete'),
    ('ADMIN', 'finance.creditnotes.create'),
    ('ADMIN', 'reconciliation.view'),
    ('ADMIN', 'reconciliation.manage'),
    ('ADMIN', 'admin.roles.manage');
    PRINT 'Populated ADMIN permissions (19 total)';
END;

-- 5. Populate RolePermissions for SENIOR_ACCOUNTANT (13 permissions)
IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleName = 'SENIOR_ACCOUNTANT')
BEGIN
    INSERT INTO RolePermissions (RoleName, PermissionId) VALUES
    ('SENIOR_ACCOUNTANT', 'accounting.view'),
    ('SENIOR_ACCOUNTANT', 'accounting.journal.post'),
    ('SENIOR_ACCOUNTANT', 'accounting.journal.reverse'),
    ('SENIOR_ACCOUNTANT', 'accounting.period.close'),
    ('SENIOR_ACCOUNTANT', 'accounting.budget.view'),
    ('SENIOR_ACCOUNTANT', 'accounting.audit.view'),
    ('SENIOR_ACCOUNTANT', 'finance.invoices.view'),
    ('SENIOR_ACCOUNTANT', 'finance.invoices.create'),
    ('SENIOR_ACCOUNTANT', 'finance.payments.view'),
    ('SENIOR_ACCOUNTANT', 'finance.payments.create'),
    ('SENIOR_ACCOUNTANT', 'finance.clients.view'),
    ('SENIOR_ACCOUNTANT', 'reconciliation.view'),
    ('SENIOR_ACCOUNTANT', 'reconciliation.manage');
    PRINT 'Populated SENIOR_ACCOUNTANT permissions (13 total)';
END;

-- 6. Populate RolePermissions for ACCOUNTS_RECEIVABLE_CLERK (5 permissions)
IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleName = 'ACCOUNTS_RECEIVABLE_CLERK')
BEGIN
    INSERT INTO RolePermissions (RoleName, PermissionId) VALUES
    ('ACCOUNTS_RECEIVABLE_CLERK', 'finance.invoices.view'),
    ('ACCOUNTS_RECEIVABLE_CLERK', 'finance.invoices.create'),
    ('ACCOUNTS_RECEIVABLE_CLERK', 'finance.payments.view'),
    ('ACCOUNTS_RECEIVABLE_CLERK', 'finance.payments.create'),
    ('ACCOUNTS_RECEIVABLE_CLERK', 'finance.clients.view');
    PRINT 'Populated AR_CLERK permissions (5 total)';
END;

-- 7. Populate RolePermissions for AUDITOR (5 permissions)
IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleName = 'AUDITOR')
BEGIN
    INSERT INTO RolePermissions (RoleName, PermissionId) VALUES
    ('AUDITOR', 'accounting.view'),
    ('AUDITOR', 'accounting.audit.view'),
    ('AUDITOR', 'finance.invoices.view'),
    ('AUDITOR', 'finance.payments.view'),
    ('AUDITOR', 'finance.clients.view');
    PRINT 'Populated AUDITOR permissions (5 total)';
END;

PRINT 'Migration 004 completed successfully';
