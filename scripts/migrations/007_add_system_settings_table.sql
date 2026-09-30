-- Migration 007: Add SystemSettings Table for Configuration Management
-- Date: 2026-09-03
-- Purpose: Store company profile, tax rates, GL policies, and security settings

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SystemSettings' AND TABLE_SCHEMA = 'dbo')
BEGIN
  CREATE TABLE dbo.SystemSettings (
    Id INT PRIMARY KEY IDENTITY(1,1),
    SettingKey NVARCHAR(100) NOT NULL UNIQUE,
    SettingValue NVARCHAR(MAX) NOT NULL,
    SettingType NVARCHAR(50) NOT NULL, -- 'company', 'tax', 'accounting', 'security', 'string', 'number', 'boolean'
    UpdatedBy INT,
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    CreatedAt DATETIME2 DEFAULT GETDATE()
  );

  CREATE NONCLUSTERED INDEX IX_SystemSettings_SettingKey ON dbo.SystemSettings(SettingKey);
  CREATE NONCLUSTERED INDEX IX_SystemSettings_UpdatedAt ON dbo.SystemSettings(UpdatedAt);
END

-- Seed default system settings
IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE SettingKey = 'company_name')
BEGIN
  INSERT INTO dbo.SystemSettings (SettingKey, SettingValue, SettingType, CreatedAt, UpdatedAt)
  VALUES
    -- Company Profile Settings
    ('company_name', 'Ghana Publishing Company Limited (GPCL)', 'company', GETDATE(), GETDATE()),
    ('company_tin', 'C0014892014', 'company', GETDATE(), GETDATE()),
    ('company_currency', 'GHS', 'company', GETDATE(), GETDATE()),
    ('fy_start_month', '1', 'company', GETDATE(), GETDATE()),

    -- Tax Rates (as percentages)
    ('tax_vat_rate', '15.0', 'tax', GETDATE(), GETDATE()),
    ('tax_nhil_rate', '2.5', 'tax', GETDATE(), GETDATE()),
    ('tax_getfund_rate', '2.5', 'tax', GETDATE(), GETDATE()),
    ('tax_wht_rate', '7.5', 'tax', GETDATE(), GETDATE()),

    -- Accounting Policies
    ('gl_imbalance_tolerance', '0.001', 'accounting', GETDATE(), GETDATE()),
    ('gl_autopost_grn', 'true', 'accounting', GETDATE(), GETDATE()),
    ('gl_allow_overdue', 'false', 'accounting', GETDATE(), GETDATE()),

    -- Security Settings
    ('jwt_timeout_hours', '8', 'security', GETDATE(), GETDATE()),
    ('api_rate_limit_per_minute', '100', 'security', GETDATE(), GETDATE());
END
