-- Migration 005: Add missing columns to Clients table

-- Add missing columns to Clients table if they don't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Clients' AND COLUMN_NAME = 'Address')
BEGIN
    ALTER TABLE Clients ADD Address NVARCHAR(500) NULL;
    PRINT 'Added Address column to Clients table';
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Clients' AND COLUMN_NAME = 'TaxId')
BEGIN
    ALTER TABLE Clients ADD TaxId NVARCHAR(50) NULL;
    PRINT 'Added TaxId column to Clients table';
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Clients' AND COLUMN_NAME = 'IsActive')
BEGIN
    ALTER TABLE Clients ADD IsActive BIT NOT NULL DEFAULT 1;
    PRINT 'Added IsActive column to Clients table';
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Clients' AND COLUMN_NAME = 'UpdatedAt')
BEGIN
    ALTER TABLE Clients ADD UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
    PRINT 'Added UpdatedAt column to Clients table';
END;

-- Create index for IsActive to improve query performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Clients_IsActive' AND object_id = OBJECT_ID('Clients'))
BEGIN
    CREATE INDEX IX_Clients_IsActive ON Clients(IsActive);
    PRINT 'Created index on Clients.IsActive';
END;

PRINT 'Migration 005 completed successfully';
