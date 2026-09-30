-- Migration: Add AuditLog table for compliance and traceability
-- This creates an immutable audit trail of all financial transactions

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AuditLog')
BEGIN
  CREATE TABLE AuditLog (
    Id INT PRIMARY KEY IDENTITY(1,1),
    EntityType NVARCHAR(50) NOT NULL,  -- e.g., 'Invoice', 'Payment', 'JournalEntry'
    EntityId NVARCHAR(50) NOT NULL,    -- The ID of the entity (could be UUID or number as string)
    Action NVARCHAR(50) NOT NULL,      -- CREATE, UPDATE, DELETE, POST, VOID, CLOSE
    UserId INT NOT NULL,               -- Who performed the action
    OldValue NVARCHAR(MAX) NULL,       -- Previous value (JSON for PATCH operations)
    NewValue NVARCHAR(MAX) NULL,       -- New value (JSON for all operations)
    Description NVARCHAR(500) NULL,    -- Human-readable description of the change
    IpAddress NVARCHAR(45) NULL,       -- IPv4 or IPv6 address
    CreatedAt DATETIME DEFAULT GETDATE() NOT NULL,  -- Timestamp (immutable)

    -- Indexes for common queries
    INDEX IX_AuditLog_EntityType_EntityId (EntityType, EntityId),
    INDEX IX_AuditLog_UserId (UserId),
    INDEX IX_AuditLog_CreatedAt (CreatedAt),
    INDEX IX_AuditLog_Action (Action)
  );

  PRINT 'Created AuditLog table successfully.';
END
ELSE
BEGIN
  PRINT 'AuditLog table already exists.';
END
