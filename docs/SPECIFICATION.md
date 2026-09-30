# Standalone Finance & Accounting System Specification & API Contract

This document provides an exhaustive, production-grade technical specification for the **Finance & Accounting Subsystem** (`gpcl-finance-service`).

---

## 1. System Architecture & Boundaries

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               OPERATIONAL SYSTEM                                 │
│                   (Jobs, Materials Store, Sales, Gazette, POS)                   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Asynchronous REST API / Webhooks / Outbox
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           FINANCE & ACCOUNTING SERVICE                           │
│   ┌──────────────────────┐ ┌──────────────────────┐ ┌────────────────────────┐   │
│   │ General Ledger (GL)  │ │ Accounts Receivable  │ │ Bank Reconciliation    │   │
│   ├──────────────────────┤ ├──────────────────────┤ ├────────────────────────┤   │
│   │ Accounts Payable     │ │ Tax & Levies Engine  │ │ Period Close & Reports │   │
│   └──────────────────────┘ └──────────────────────┘ └────────────────────────┘   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           STANDALONE DATABASE (gpcl_finance_db)                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Domain Principles
1. **Double-Entry Bookkeeping Enforcement**: Every journal transaction must have total Debits equal total Credits within a tolerance of `0.001` GHS (`GL_BALANCE_TOLERANCE`).
2. **Financial Year Period Lock**: Transactions cannot be posted to a financial year with status `CLOSED`. Attempts yield a HTTP 409 (`ClosedPeriodError`).
3. **Statutory Ghana Levy Calculation**: Ghana tax regime (15% VAT, 2.5% NHIL, 2.5% GETFund) calculated on net selling price. PAYE and WHT calculated dynamically based on effective year bands/rates.
4. **Idempotent Integration API**: All integration endpoints require `Idempotency-Key` headers to guarantee zero duplicate journal postings.

---

## 2. Database Schema (`gpcl_finance_db`)

### 2.1 Chart of Accounts & Financial Periods

```sql
CREATE TABLE Accounts (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Code VARCHAR(20) NOT NULL UNIQUE,          -- e.g., '1100', '1202', '4001', '5001'
    Name NVARCHAR(150) NOT NULL,
    Type VARCHAR(20) NOT NULL,                  -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
    IsControl BIT NOT NULL DEFAULT 0,          -- Control accounts (AR/AP/Inventory) block manual direct posts
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE FinancialPeriods (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    FinancialYear INT NOT NULL UNIQUE,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED', 'PROCESSING'
    ClosedAt DATETIME2 NULL,
    ClosedBy INT NULL
);
```

### 2.2 General Ledger & Journal Entries

```sql
CREATE TABLE JournalEntries (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    EntryNumber VARCHAR(30) NOT NULL UNIQUE,    -- Format: 'JNL-YYYY-XXXXXX'
    EntryDate DATE NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    Reference VARCHAR(100) NULL,
    SourceModule VARCHAR(50) NOT NULL,          -- 'STORE_GRN', 'STORE_ADJUSTMENT', 'JOB_COMPLETION', 'INVOICE', 'PAYMENT', 'GAZETTE', 'OPENING_BALANCE'
    SourceId VARCHAR(100) NOT NULL,             -- Loosely bound external operational entity ID
    Status VARCHAR(20) NOT NULL DEFAULT 'POSTED', -- 'POSTED', 'REVERSED'
    ReversalOfId INT NULL REFERENCES JournalEntries(Id),
    PostedBy INT NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE JournalEntryLines (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    JournalEntryId INT NOT NULL REFERENCES JournalEntries(Id) ON DELETE CASCADE,
    AccountId INT NOT NULL REFERENCES Accounts(Id),
    BranchId INT NULL,
    Description NVARCHAR(250) NULL,
    Debit DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    Credit DECIMAL(18,4) NOT NULL DEFAULT 0.0000
);
```

### 2.3 Accounts Receivable & Payable (Invoices, Payments, Credit Notes)

```sql
CREATE TABLE Invoices (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceNumber VARCHAR(30) NOT NULL UNIQUE,  -- 'INV-YYYY-XXXXXX'
    ClientId INT NOT NULL,
    InvoiceDate DATE NOT NULL,
    DueDate DATE NOT NULL,
    SubTotal DECIMAL(18,2) NOT NULL,
    VatAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    NhisAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    GetfundAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    TotalAmount DECIMAL(18,2) NOT NULL,
    BalanceDue DECIMAL(18,2) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PARTIAL', 'PAID', 'VOID', 'CANCELLED'
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE Payments (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PaymentNumber VARCHAR(30) NOT NULL UNIQUE,  -- 'PAY-YYYY-XXXXXX'
    ClientId INT NOT NULL,
    PaymentDate DATE NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    PaymentMethod VARCHAR(30) NOT NULL,          -- 'CASH', 'CHEQUE', 'BANK_TRANSFER', 'MOMO'
    Reference VARCHAR(100) NULL,
    BankAccountId INT NULL,
    ClearedDate DATE NULL,                       -- Set upon Bank Reconciliation match
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE CreditNotes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CreditNoteNumber VARCHAR(30) NOT NULL UNIQUE,
    ClientId INT NOT NULL,
    IssueDate DATE NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    AmountApplied DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    Reason NVARCHAR(250) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'PARTIALLY_APPLIED', 'FULLY_APPLIED', 'VOID'
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
```

### 2.4 Bank Reconciliation Subsystem

```sql
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

CREATE TABLE BankStatements (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    BankAccountId INT NOT NULL REFERENCES BankAccounts(Id),
    Filename NVARCHAR(255) NOT NULL,
    UploadDate DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    UploadedBy INT NOT NULL
);

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
    MatchingStatus VARCHAR(20) NOT NULL DEFAULT 'UNMATCHED', -- 'UNMATCHED', 'PENDING_REVIEW', 'CLEARED'
    MatchedPaymentId INT NULL REFERENCES Payments(Id)
);

CREATE TABLE ReconciliationVariances (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    BankAccountId INT NOT NULL REFERENCES BankAccounts(Id),
    VarianceType VARCHAR(50) NOT NULL,        -- 'BANK_CHARGE', 'INTEREST_CREDIT', 'TIMING_DIFFERENCE', 'DISCREPANCY'
    Amount DECIMAL(18,2) NOT NULL,
    Description NVARCHAR(250) NOT NULL,
    BankTransactionId INT NULL REFERENCES BankTransactions(Id),
    PaymentId INT NULL REFERENCES Payments(Id),
    GLJournalEntryId INT NULL REFERENCES JournalEntries(Id),
    ResolvedAt DATETIME2 NULL,
    ResolvedBy INT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
```

### 2.5 Statutory Tax & Levy Configuration

```sql
CREATE TABLE PAYEBands (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    EffectiveYear INT NOT NULL,
    BandOrder INT NOT NULL,
    LowerInclusive DECIMAL(18,2) NOT NULL,
    UpperExclusive DECIMAL(18,2) NULL,        -- NULL denotes top open-ended band
    Rate DECIMAL(6,4) NOT NULL
);

CREATE TABLE WHTRates (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    EffectiveYear INT NOT NULL,
    PayeeType VARCHAR(50) NOT NULL,           -- 'RENT_COMMERCIAL', 'SERVICES_RESIDENT', 'CONTRACTOR', etc.
    Description NVARCHAR(200) NOT NULL,
    Rate DECIMAL(6,4) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1
);
```

---

## 3. Integration API Specifications for Operational Systems

All requests must be sent over HTTPS with an `Authorization: Bearer <JWT>` header and an `Idempotency-Key: <UUID>` header.

### 3.1 Post Operational Journal Entry
**`POST /api/v1/journals/events`**

#### Request Payload
```json
{
  "idempotencyKey": "evt_9f8d7e6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c",
  "sourceModule": "STORE_GRN",
  "sourceId": "GRN-2026-00142",
  "entryDate": "2026-09-01",
  "description": "GRN #GRN-2026-00142 - Paper Stock Delivery",
  "reference": "PO-88412",
  "postedBy": 104,
  "lines": [
    {
      "accountCode": "1202",
      "description": "Coated Art Paper 130gsm",
      "debit": 15400.00,
      "credit": 0.00,
      "branchId": 1
    },
    {
      "accountCode": "2001",
      "description": "GRN Suspense - Supplier X",
      "debit": 0.00,
      "credit": 15400.00,
      "branchId": 1
    }
  ]
}
```

#### Success Response (`201 Created`)
```json
{
  "status": "SUCCESS",
  "journalEntryId": 89412,
  "entryNumber": "JNL-2026-089412",
  "postedAt": "2026-09-01T22:15:00Z"
}
```
