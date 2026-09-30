-- Migration 010: persist invoice line items (previously only totals were stored,
-- so an invoice could not be reprinted with its items).
IF OBJECT_ID('dbo.InvoiceLines', 'U') IS NULL
BEGIN
    CREATE TABLE InvoiceLines (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        InvoiceId INT NOT NULL CONSTRAINT FK_InvoiceLines_Invoices REFERENCES Invoices(Id),
        LineNumber INT NOT NULL,
        Description NVARCHAR(500) NOT NULL,
        Quantity DECIMAL(18,4) NOT NULL,
        UnitPrice DECIMAL(18,4) NOT NULL,
        LineTotal DECIMAL(18,2) NOT NULL,
        CONSTRAINT UQ_InvoiceLines UNIQUE (InvoiceId, LineNumber)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invoices_ClientId' AND object_id = OBJECT_ID('dbo.Invoices'))
    CREATE INDEX IX_Invoices_ClientId ON Invoices(ClientId, Status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Payments_InvoiceId' AND object_id = OBJECT_ID('dbo.Payments'))
    CREATE INDEX IX_Payments_InvoiceId ON Payments(InvoiceId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_JournalEntryLines_JournalEntryId' AND object_id = OBJECT_ID('dbo.JournalEntryLines'))
    CREATE INDEX IX_JournalEntryLines_JournalEntryId ON JournalEntryLines(JournalEntryId);
