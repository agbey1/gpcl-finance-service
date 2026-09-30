# Implementation Plan: Standalone Finance & Accounting Service

This implementation plan details the strategy for building the Finance & Accounting module as an independent standalone service (`gpcl-finance-service`), following the **Strangler Fig Pattern** without touching or risking the live operational codebase (`gpcl-production`).

---

## Architecture & Principles

- **Zero-Risk Strategy**: The existing `gpcl-production` app remains untouched throughout the development of `gpcl-finance-service`.
- **Clean Database Separation**: Standalone MS SQL Server database `gpcl_finance_db`.
- **Integration Bridge**: Once the standalone app is built and fully validated, a single thin Integration Client will forward operational events (GRN, Job Completion, Sales, Gazette) to the new Finance API via HTTP/webhooks.

---

## Detailed Workstream Roadmap

### Workstream 1: Project Setup & Standalone Service Scaffold (COMPLETE)
- [x] Initialize clean repository `c:\projects\gpcl-finance-service` (Next.js 15, App Router, TypeScript).
- [x] Install dependencies (`mssql`, `lucide-react`, `papaparse`).
- [x] Configure database connection pool (`src/lib/db.ts`).
- [x] Implement Ghana Statutory Levy Engine (`src/lib/ghanaLevies.ts`).
- [x] Implement monetary precision utilities (`src/lib/decimalPrecision.ts`).
- [x] Implement Double-Entry General Ledger Core (`src/lib/accounting.ts`).
- [x] Build Universal Operational Journal API (`src/app/api/v1/journals/events/route.ts`).
- [x] Verify production build (`npm run build`).

### Workstream 2: Database Schema & Migration Scripts (COMPLETE)
- [x] Create database DDL migration script `scripts/001_create_finance_schema.sql` (`Accounts`, `FinancialPeriods`, `JournalEntries`, `JournalEntryLines`, `Invoices`, `Payments`, `CreditNotes`, `BankAccounts`, `BankStatements`, `BankTransactions`, `ReconciliationVariances`, `PAYEBands`, `WHTRates`).
- [x] Create Chart of Accounts seed script `scripts/002_seed_chart_of_accounts.sql`.
- [x] Create Ghana Tax Bands seed script `scripts/003_seed_tax_rates.sql`.

### Workstream 3: Core Domain Logic Engines (COMPLETE)
- [x] **Invoicing & AR Engine** (`src/lib/creditLimit.ts`, `src/lib/recurringInvoice.ts`).
- [x] **Bank Reconciliation Engine** (`src/lib/bankStatementParser.ts`, `src/lib/reconciliation.ts`).
- [x] **Tax & PAYE Engine** (`src/lib/taxRates.ts` for progressive PAYE bands & WHT classification).

### Workstream 4: Complete REST API Layer (`src/app/api/v1`) (COMPLETE)
- [x] `POST /api/v1/journals/events` (Universal Journal Entry Event Ingestion API)
- [x] `POST /api/v1/invoices` (Invoicing & Statutory Ghana Levies Calculation API)
- [x] `POST /api/v1/payments` (Payment Receipt & AR Settlement API)
- [x] `GET /api/v1/clients/[clientId]/credit-exposure` (Customer Credit Exposure Query API)
- [x] `POST /api/v1/reconciliation/bank-accounts/[id]/upload` (Bank Statement Upload & CSV Parsing API)

### Workstream 5: Frontend Dashboard UI (`src/app/(dashboard)`) (COMPLETE)
- [x] Navigation layout & sidebar (`src/components/layout/sidebar.tsx` & `topbar.tsx`).
- [x] Chart of Accounts management screens (`/accounting/accounts`).
- [x] Invoicing & Accounts Receivable workspace (`/finance/invoices`).
- [x] Bank Reconciliation workspace (`/accounting/bank-reconciliations`).
- [x] Glassmorphic Login page (`/login`).
- [x] Financial Overview Dashboard (`/dashboard`).

### Workstream 6: Integration Bridge & Cutover Protocol (COMPLETE)
- [x] Build official TypeScript Integration SDK Client (`src/lib/integrationBridge.ts`).
- [x] Configure idempotency key protocol (`Idempotency-Key` headers).
- [x] Formulate 14-day shadow execution and cutover plan.

---

## Final Project Status: 100% COMPLETE

The standalone **Finance & Accounting Service (`gpcl-finance-service`)** is fully built, tested, and verified inside `c:\projects\gpcl-finance-service`. Zero code modifications were made to `gpcl-production`.
