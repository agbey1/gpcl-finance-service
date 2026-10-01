-- Migration 013: payment reversal support.
-- Status/ReversedAt/ReversedBy/ReversalReason track reversals; OverpaymentCreditNoteId
-- links the open credit note created when a payment exceeded the invoice balance.
IF COL_LENGTH('dbo.Payments', 'Status') IS NULL
  ALTER TABLE dbo.Payments ADD Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT 'POSTED';
IF COL_LENGTH('dbo.Payments', 'OverpaymentCreditNoteId') IS NULL
  ALTER TABLE dbo.Payments ADD OverpaymentCreditNoteId INT NULL;
IF COL_LENGTH('dbo.Payments', 'ReversedAt') IS NULL
  ALTER TABLE dbo.Payments ADD ReversedAt DATETIME2 NULL, ReversedBy INT NULL, ReversalReason NVARCHAR(400) NULL;

IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = 'ADMIN')
  AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleName = 'ADMIN' AND PermissionId = 'finance.payments.reverse')
  INSERT INTO dbo.RolePermissions (RoleName, PermissionId) VALUES ('ADMIN', 'finance.payments.reverse');
IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = 'SENIOR_ACCOUNTANT')
  AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleName = 'SENIOR_ACCOUNTANT' AND PermissionId = 'finance.payments.reverse')
  INSERT INTO dbo.RolePermissions (RoleName, PermissionId) VALUES ('SENIOR_ACCOUNTANT', 'finance.payments.reverse');
