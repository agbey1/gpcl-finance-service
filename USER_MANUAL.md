# Ghana Publishing Company Limited (GPCL)
## Finance & Accounting System — Operations & User Manual

---

**Document Control:** Financial Standard Operating Procedure (SOP)  
**Target Audience:** Finance Directorate, Chief Accountants, Accounts Receivable (AR) Officers, Accounts Payable (AP) Officers, Cashiers, Financial Controllers, Internal Auditors  
**Scope:** Commercial Finance, General Ledger, Statutory Ghana Tax Compliance, Cash & Bank Management, Financial Reporting  
**Effective Period:** Financial Year 2026 / 2027  

---

## Table of Contents

1. [System Overview & Financial Principles](#1-system-overview--financial-principles)
   - 1.1 Purpose of the Finance System
   - 1.2 Core Accounting Safeguards
   - 1.3 Navigating the Finance Portal
2. [User Access & Security](#2-user-access--security)
   - 2.1 Logging In to Your Finance Account
   - 2.2 Security Best Practices & Passwords
   - 2.3 Automatic Session Lock
3. [Financial Overview Dashboard](#3-financial-overview-dashboard)
   - 3.1 Executive Financial Health Indicators
   - 3.2 Visual Performance Analytics (Revenue vs. COGS, Expense Distribution)
   - 3.3 Financial Ratios & Liquidity Diagnostics
   - 3.4 Quick Action Shortcuts
4. [High-Speed Voucher Entry Workspace (F4 – F9)](#4-high-speed-voucher-entry-workspace-f4--f9)
   - 4.1 The Fast Voucher Concept
   - 4.2 Quick Reference Keyboard Shortcut Chart
   - 4.3 Detailed Guide by Voucher Type:
     - Contra Voucher (F4) — Banking & Cash Transfers
     - Payment Voucher (F5) — Direct Disbursements & Vendor Bills
     - Receipt Voucher (F6) — Direct Cash & Non-Invoice Collections
     - Journal Voucher (F7) — Adjustments, Provisions & Accruals
     - Sales Voucher (F8) — Direct Commercial Sales & Gazette
     - Purchase Voucher (F9) — Raw Material & Inventory Receipts
     - Credit Note (Ctrl+F8) — Price Reductions & Job Returns
     - Debit Note (Ctrl+F9) — Supplier Adjustments & Returns
   - 4.4 Balancing Rules & Real-Time Balance Indicators
5. [Chart of Accounts & Opening Balances](#5-chart-of-accounts--opening-balances)
   - 5.1 Account Numbering Scheme & Five Main Categories
   - 5.2 Control Accounts Explained (AR, AP, Inventory)
   - 5.3 Adding a New Account to the General Ledger
   - 5.4 Setting & Verifying Opening Balances
6. [Journal Entries Register & Ledger Audit](#6-journal-entries-register--ledger-audit)
   - 6.1 Reviewing the Transaction Register
   - 6.2 Posting Manual Journal Adjustments
   - 6.3 Reversing Posted Journals (The Audit-Compliant Correction Method)
7. [Commercial Invoicing & Accounts Receivable (AR)](#7-commercial-invoicing--accounts-receivable-ar)
   - 7.1 Creating a Commercial Sales Invoice
   - 7.2 Ghana Statutory Tax & Levy Computation (VAT, NHIL, GETFund)
   - 7.3 Standing & Recurring Publication Schedules
   - 7.4 Generating Printable Full-Page A4 Invoices & Official PDF Downloads
   - 7.5 Voiding an Invoice & Reversing Sales Entries
8. [Customer Payments & AR Settlement Hub](#8-customer-payments--ar-settlement-hub)
   - 8.1 Collecting & Recording Customer Payments
   - 8.2 Payment Methods (Bank Transfers, Cheques, Cash, Mobile Money)
   - 8.3 Matching Payments to Invoices
   - 8.4 Cheque Clearance & Bank Verification
   - 8.5 Generating & Printing Official Payment Receipts
9. [Bank Reconciliation Workspace](#9-bank-reconciliation-workspace)
   - 9.1 Multi-Bank Operations (GCB Bank & Ecobank)
   - 9.2 Uploading Your Bank Statement File (CSV)
   - 9.3 Automated Transaction Matching
   - 9.4 Resolving Variances (Bank Charges, Interest Credits)
10. [Fiscal Budgets vs. Actual Expenditure Control](#10-fiscal-budgets-vs-actual-expenditure-control)
    - 10.1 Expense Budget Allocation
    - 10.2 Monitoring Budget Consumption & Variances
    - 10.3 Identifying Overspending & Under-spending
11. [Fiscal Period Close & Financial Year Lock](#11-fiscal-period-close--financial-year-lock)
    - 11.1 Purpose of Period Locking
    - 11.2 Monthly Close Checklist
    - 11.3 Step-by-Step Guide to Locking a Period
    - 11.4 Reopening a Locked Period for Audit Adjustments
12. [Ghana Statutory Tax & Levy Returns (GRA)](#12-ghana-statutory-tax--levy-returns-gra)
    - 12.1 GRA Statutory Deadlines (15th of Every Month)
    - 12.2 Monthly VAT, NHIL, and GETFund Computation
    - 12.3 Exporting Official GRA Tax Returns
13. [Financial Reports & Statements](#13-financial-reports--statements)
    - 13.1 Trial Balance Statement
    - 13.2 Day Book (Daily Transaction Register)
    - 13.3 Profit & Loss Statement (Income Statement)
    - 13.4 Balance Sheet (Statement of Financial Position)
    - 13.5 Accounts Receivable Aging Analysis (Current, 30, 60, 90+ Days)
    - 13.6 Exporting to PDF, Excel (XLSX), and CSV Formats
14. [Staff Roles, Permissions & Security Audit](#14-staff-roles-permissions--security-audit)
    - 14.1 Finance Department User Roles (Admin, Senior Accountant, AR Clerk, Auditor)
    - 14.2 Managing Staff Accounts & Resetting Passwords
    - 14.3 Reviewing the Financial Audit Trail (Activity Logs)
    - 14.4 Financial Policies & Organization Settings
15. [Financial Troubleshooting & Frequently Asked Questions (FAQ)](#15-financial-troubleshooting--frequently-asked-questions-faq)

---

## 1. System Overview & Financial Principles

### 1.1 Purpose of the Finance System
The **GPCL Finance & Accounting System** is the official financial platform of **Ghana Publishing Company Limited (Assembly Press)**. It provides end-to-end accounting governance for all commercial transactions, government publishing jobs, gazette sales, material inventories, supplier settlements, statutory tax filings, and management accounting.

### 1.2 Core Accounting Safeguards
To safeguard GPCL's financial integrity and comply with International Financial Reporting Standards (IFRS) and the Ghana Revenue Authority (GRA), the system enforces four foundational rules:

1. **Strict Double-Entry Bookkeeping:**  
   Every transaction requires total Debits to equal total Credits:  
   $$\text{Total Debits} = \text{Total Credits}$$  
   If an entry does not balance to the pesewa, the system prevents posting.
2. **Control Account Integrity:**  
   Key control accounts—specifically **Trade Receivables (#1100)**, **Trade Payables (#2001)**, and **Materials Store Inventory (#1202)**—cannot receive direct manual journal entries. Transactions affecting these accounts must originate from the appropriate business transactions (Invoices, Customer Payments, Credit Notes, or Stores Goods Received Notes) to prevent discrepancies between the General Ledger and subsidiary ledgers.
3. **Automated Ghana Statutory Levies:**  
   All commercial sales automatically calculate the three statutory levies mandated by Ghana tax law:
   - **Value Added Tax (VAT):** 15.0%
   - **National Health Insurance Levy (NHIL):** 2.5%
   - **Ghana Education Trust Fund (GETFund):** 2.5%  
   *(Total effective levy: 20.0% of the net selling price).*
4. **Period Lock Protection:**  
   Once a monthly accounting period is formally closed, it is locked. The system rejects any attempts to backdate or insert transactions into closed periods to maintain audit compliance.

### 1.3 Navigating the Finance Portal
The interface features an intuitive, full-height navigation sidebar on the left and a top status bar:
- **Sidebar Menu:** Expand or collapse the sidebar using the chevron icon at the top.
- **Header:** Displays today's operating date, system connectivity status, and your user profile with a quick sign-out link.
- **Color Coding:**
  - Blue: Informational and Asset accounts
  - Green: Revenue accounts, completed payments, and balanced transactions
  - Amber / Gold: Liabilities, pending cheques, and items requiring attention
  - Red: Expenses, overdue client balances, and unbalanced entries

---

## 2. User Access & Security

### 2.1 Logging In to Your Finance Account
1. Open your web browser and navigate to the GPCL Finance portal.
2. Enter your assigned corporate email address (e.g., `sadjei@gpcl.com`).
3. Enter your confidential password.
4. Click the eye icon if you wish to verify your password characters.
5. Click **Sign In**.

### 2.2 Security Best Practices & Passwords
- Never share your login credentials with colleagues. All actions in the system are permanently logged against your personal user account.
- Passwords must be at least **6 characters** long and should include letters, numbers, and symbols.
- If you suspect someone knows your password, request an immediate password reset from the Chief Accountant or Finance Administrator.

### 2.3 Automatic Session Lock
To prevent unauthorized access when walking away from your workstation, your session automatically logs out after **8 hours** of continuous activity. Simply sign in again to resume your work without losing saved records.

---

## 3. Financial Overview Dashboard

Upon signing in, the **Financial Overview Dashboard** presents an executive summary of GPCL's live financial position.

### 3.1 Executive Financial Health Indicators
Four KPI summary cards across the top display real-time balances:
- **Trade Receivables (AR):** Total open balances owed by commercial clients, government ministries, and corporate accounts, along with month-over-month growth.
- **Gross Operating Profit:** Net commercial revenue minus Cost of Goods Sold (COGS), with overall gross profit margin percentage.
- **Ghana Levies (VAT/NHIL/GETFund):** Cumulative tax liabilities accrued during the current filing month.
- **Bank Account Balance:** Total liquid funds held across GPCL's primary operating accounts (GCB Bank and Ecobank).

### 3.2 Visual Performance Analytics
- **Monthly Revenue vs. Cost of Goods Sold (COGS):** A monthly comparative bar chart illustrating commercial sales performance against raw paper stock and production costs.
- **Operational Expense Distribution:** A breakdown illustrating where operating funds are consumed: Paper Stock COGS, Staff Salaries, Ghana Levies, Office Utilities, and Freight Handling.
- **Recent General Ledger Postings:** A real-time activity register showing incoming journal postings from store deliveries, invoices, customer payments, and gazette receipts.

### 3.3 Financial Ratios & Liquidity Diagnostics
The dashboard automatically monitors organizational liquidity:
- **Current Ratio ($> 1.5 : 1$):** Measures GPCL's ability to cover short-term liabilities using liquid assets.
- **Quick Ratio ($> 0.5 : 1$):** Evaluates immediate cash availability without relying on raw paper inventories.
- **Debt-to-Equity Ratio:** Measures total organizational debt relative to equity capital.

### 3.4 Quick Action Shortcuts
Buttons at the top right allow immediate access to primary tasks:
- **New Invoice:** Opens the sales invoicing workspace.
- **Record Payment:** Opens the customer payment collection screen.
- **Post Voucher (F4–F9):** Launches the fast double-entry voucher entry tool.

---

## 4. High-Speed Voucher Entry Workspace (F4 – F9)

Designed specifically for accounts officers and ledger clerks, this workspace allows rapid entry of accounting vouchers without touching the mouse.

### 4.1 The Fast Voucher Concept
Located under **Accounting → Voucher Entry (F4-F9)**, this tool operates like standard accounting systems (such as Tally). Pressing function keys (`F4` to `F9`) instantly switches between voucher modes, pre-configuring account filters and debit/credit rules.

### 4.2 Quick Reference Keyboard Shortcut Chart

| Shortcut | Voucher Type | Primary Accounting Purpose | Typical General Ledger Accounts |
|---|---|---|---|
| **`F4`** | **Contra Voucher** | Cash deposits into bank, cash withdrawals, inter-bank transfers | Dr Bank Account (1002) / Cr Main Cash (1001) |
| **`F5`** | **Payment Voucher** | Cash/bank disbursements for vendor bills, utilities, petty cash expenses | Dr Office Utilities (6400) / Cr GCB Bank (1002) |
| **`F6`** | **Receipt Voucher** | Direct cash or bank receipts not linked to an invoice (e.g., scrap sales) | Dr GCB Bank (1002) / Cr Sundry Revenue (4200) |
| **`F7`** | **Journal Voucher** | Non-cash accounting adjustments, accruals, depreciation, corrections | Dr Depreciation / Cr Accumulated Depreciation |
| **`F8`** | **Sales Voucher** | Manual commercial sales or direct publication revenue postings | Dr Trade Receivables (1100) / Cr Printing Revenue (4001) |
| **`F9`** | **Purchase Voucher** | Materials stock purchases, raw paper reels, and supplier credit purchases | Dr Paper Stock Inventory (1202) / Cr Accounts Payable (2001) |
| **`Ctrl + F8`** | **Credit Note** | Client price allowances, returned defective print runs, rebates | Dr Sales Returns (4200) / Cr Trade Receivables (1100) |
| **`Ctrl + F9`** | **Debit Note** | Returns of damaged printing paper or consumables back to suppliers | Dr Accounts Payable (2001) / Cr Paper Stock Inventory (1202) |

### 4.3 Detailed Guide by Voucher Type

#### Contra Voucher (F4) — Banking & Cash Transfers
- **When to use:** Whenever physical money moves between cash boxes and bank accounts, or between GCB Bank and Ecobank. No third-party party is involved.
- **Example:** Depositing GHS 5,000 from the Assembly Press cash office into the GCB Bank operating account.
  - Line 1: Debit `1002` (GCB Bank Operating Account) — GHS 5,000.00
  - Line 2: Credit `1001` (Main Cash Account) — GHS 5,000.00

#### Payment Voucher (F5) — Direct Disbursements
- **When to use:** Paying immediate supplier expenses, purchasing consumables, settling utility bills, or issuing cash disbursements.
- **Example:** Paying GHS 1,200 for electricity from Ecobank.
  - Line 1: Debit `6400` (Utilities & Office Expenses) — GHS 1,200.00
  - Line 2: Credit `1003` (Ecobank Operational Account) — GHS 1,200.00

#### Receipt Voucher (F6) — Direct Cash Collections
- **When to use:** Collecting income that does not require an official commercial invoice (e.g., selling scrap waste paper, interest income).
- **Example:** Receiving GHS 800 cash for paper offcuts.
  - Line 1: Debit `1001` (Main Cash Account) — GHS 800.00
  - Line 2: Credit `4200` (Sales Returns & Scrap Income) — GHS 800.00

#### Journal Voucher (F7) — Adjustments & Accruals
- **When to use:** Pure ledger-to-ledger adjustments, month-end accruals, depreciation allocations, or correcting misclassified expenses. No cash or bank accounts are touched.
- **Example:** Accruing monthly audit fees of GHS 5,000.
  - Line 1: Debit `6400` (Professional Fees Expense) — GHS 5,000.00
  - Line 2: Credit `2001` (Accrued Liabilities) — GHS 5,000.00

### 4.4 Balancing Rules & Real-Time Balance Indicators
- Enter line items with **Account Code**, **Particulars**, and either **Debit** or **Credit**.
- Click **+ Add Entry Line** for split transactions involving three or more accounts.
- Write a clear, comprehensive description in the **Narration / Entry Notes** field.
- Review the footer:
  - If balanced, the indicator reads <span style="color:#059669; font-weight:700;">✓ DOUBLE ENTRY BALANCED</span>, and the **Post Voucher to Ledger** button activates.
  - If unbalanced, the indicator reads <span style="color:#dc2626; font-weight:700;">⚠ UNBALANCED VOUCHER</span>, and the posting button remains disabled.

---

## 5. Chart of Accounts & Opening Balances

The **Chart of Accounts** (located under **Accounting → Chart of Accounts**) organizes all general ledger accounts across five main categories.

### 5.1 Account Numbering Scheme & Five Main Categories

```
┌────────────────────────────────────────────────────────────────────────┐
│ GPCL CHART OF ACCOUNTS NUMBERING SCHEME                                │
├──────────────┬──────────────────┬─────────────────┬────────────────────┤
│ Number Range │ Category         │ Normal Balance  │ Financial Role     │
├──────────────┼──────────────────┼─────────────────┼────────────────────┤
│ 1000 – 1999  │ ASSETS           │ Debit           │ Cash, Bank, AR     │
│ 2000 – 2999  │ LIABILITIES      │ Credit          │ AP, Taxes Payable  │
│ 3000 – 3999  │ EQUITY           │ Credit          │ Capital, Reserves  │
│ 4000 – 4999  │ REVENUE          │ Credit          │ Printing, Gazette  │
│ 5000 – 5999  │ COST OF GOODS    │ Debit           │ Raw Paper, Inks    │
│ 6000 – 6999  │ EXPENSES         │ Debit           │ Payroll, Utilities │
└──────────────┴──────────────────┴─────────────────┴────────────────────┘
```

#### Standard Key Accounts Reference:
- **`1001` — Main Cash Account:** Cash held in the Assembly Press cash office.
- **`1002` — GCB Bank Operating Account:** Primary commercial collection account.
- **`1003` — Ecobank Operational Account:** Operating disbursement account.
- **`1100` — Trade Receivables (AR):** Total outstanding balance owed by customers.
- **`1201` — Finished Goods Inventory:** Completed publications and gazette inventory.
- **`1202` — Materials Store Inventory:** Raw paper reels, printing plates, inks.
- **`2001` — Accounts Payable (AP):** Balances owed to raw material suppliers.
- **`2100` — VAT Payable (15%):** Value Added Tax liability owed to the GRA.
- **`2102` — NHIS Payable (2.5%):** National Health Insurance Levy collections.
- **`2103` — GETFund Payable (2.5%):** Ghana Education Trust Fund collections.
- **`4001` — Commercial Printing Revenue:** Revenue from private and public print contracts.
- **`4100` — Gazette Publication Revenue:** Revenue from statutory gazette notices and subscriptions.
- **`5001` — Cost of Goods Sold (COGS):** Direct raw material consumption for printed jobs.
- **`6100` — Salaries & Wages Expense:** Staff payroll disbursements.
- **`6300` — Bank Service Charges & Fees:** Bank transaction and ledger fees.
- **`6400` — Utilities & Office Expenses:** Electricity, water, generator fuel.

### 5.2 Control Accounts Explained
Accounts designated as **Control Accounts** (e.g., Trade Receivables `#1100`, Trade Payables `#2001`, Inventory `#1202`) maintain sub-ledgers with individual customer and vendor accounts. Direct manual journal postings to these accounts are blocked to prevent the General Ledger from falling out of balance with customer statements.

### 5.3 Adding a New Account to the General Ledger
1. Click **Add New Account** at the top right of the Chart of Accounts.
2. Enter a unique 4-digit **Account Code** within the proper number series.
3. Enter a clear **Account Name** (e.g., `Generator Fuel & Oil Consumables`).
4. Select the **Account Category / Type** (Asset, Liability, Equity, Revenue, Expense).
5. Specify an opening balance if carrying forward an audited position.
6. Leave *Is Control Account* unchecked unless this account will maintain a separate sub-ledger.
7. Click **Create Account**.

### 5.4 Setting & Verifying Opening Balances
1. Locate the target account in the table using the search bar or category filters.
2. Click **Edit Opening** in the Action column.
3. Enter the audited starting balance in Ghana Cedis.
4. Click **Update Opening Balance**.

---

## 6. Journal Entries Register & Ledger Audit

Located under **Accounting → Journal Entries Register**, this register records every transaction posted to the General Ledger.

### 6.1 Reviewing the Transaction Register
- **Search & Filter:** Search by Entry Number (e.g., `JNL-2026-089412`), Source Module (`INVOICE`, `PAYMENT`, `STORE_GRN`, `GAZETTE`, `PAYROLL`), or Reference.
- Each entry displays the posting date, reference number, description, total debits, total credits, and current status (`POSTED` or `REVERSED`).

### 6.2 Posting Manual Journal Adjustments
1. Click **New Manual Journal Entry**.
2. Enter the **Description / Narration** (e.g., `Month-end Accrual Adjustment for Outstanding Water Bill`).
3. Enter the supporting reference number (e.g., `MEMO-2026-09`).
4. Enter the balancing amount.
5. Click **Post Manual Journal**. The system issues an official sequential entry number.

### 6.3 Reversing Posted Journals (Audit-Compliant Correction)
In accordance with professional accounting standards, posted entries are never deleted. To cancel an erroneous entry:
1. Locate the transaction in the register.
2. Click **Reverse** in the Actions column.
3. The system marks the original transaction as `REVERSED` and automatically posts an offsetting journal entry that swaps all debits and credits, permanently linking the correction in the audit trail.

---

## 7. Commercial Invoicing & Accounts Receivable (AR)

The Invoicing module (located under **Finance → Invoices & AR**) manages commercial client accounts, credit limits, Ghana statutory levies, and receivables aging.

### 7.1 Creating a Commercial Sales Invoice
1. Click **Create New Invoice**.
2. **Customer / Client Name:** Select or enter the customer (e.g., *Ministry of Communications*, *Graphic Communications Group*, *Ghana Publishing Client A*).
3. **Itemized Line Items:**
   - Enter item description (e.g., *Printing 5,000 Copies Gazette Manual*).
   - Enter Quantity and Unit Price in GHS.
   - Click **+ Add Item Row** for invoices with multiple job items.
4. Review the automatic tax calculation in the breakdown box.
5. *Optional:* If this is an ongoing retainer contract, check **Set as Recurring Invoice Schedule** and select the frequency (Weekly, Monthly, Quarterly, Yearly).
6. Click **Generate Commercial Invoice**.

### 7.2 Ghana Statutory Tax & Levy Computation (VAT, NHIL, GETFund)
The system calculates Ghana statutory levies on taxable supplies:
$$\text{Net Subtotal} = \sum (\text{Quantity} \times \text{Unit Selling Price})$$
$$\text{VAT (15.0\%)} = \text{Net Subtotal} \times 0.15$$
$$\text{NHIL (2.5\%)} = \text{Net Subtotal} \times 0.025$$
$$\text{GETFund (2.5\%)} = \text{Net Subtotal} \times 0.025$$
$$\text{Total Gross Invoice Amount} = \text{Net Subtotal} + \text{VAT} + \text{NHIL} + \text{GETFund}$$
*Total statutory levies equal 20.0% of the net selling price.*

```
┌────────────────────────────────────────────────────────────────────────┐
│ AUTOMATIC GENERAL LEDGER POSTING ON INVOICE CREATION                   │
├────────────────────────────────────────┬──────────────┬────────────────┤
│ Account Particulars                    │ Debit (GHS)  │ Credit (GHS)   │
├────────────────────────────────────────┼──────────────┼────────────────┤
│ Dr Trade Receivables (#1100)           │ Gross Total  │ —              │
│ Cr Commercial Printing Revenue (#4001) │ —            │ Net Subtotal   │
│ Cr VAT Payable 15% (#2100)             │ —            │ 15% VAT Amount │
│ Cr NHIL Payable 2.5% (#2102)           │ —            │ 2.5% NHIL Amt  │
│ Cr GETFund Payable 2.5% (#2103)        │ —            │ 2.5% GETFund   │
└────────────────────────────────────────┴──────────────┴────────────────┘
```

### 7.3 Standing & Recurring Publication Schedules
Invoices marked as recurring display an indicator tag (e.g., `MONTHLY`). The system generates the invoice on each recurring billing date, eliminating manual re-entry for regular publishing contracts.

### 7.4 Generating Printable Full-Page A4 Invoices & Official PDF Downloads
1. In the Invoices table, click **View Invoice** on any invoice record.
2. A formal A4 Commercial Invoice preview appears featuring official GPCL Assembly Press letterhead, corporate TIN (`C0014892014`), itemized charges, and statutory tax breakdown.
3. Click **Download Vector PDF** to export an official digital invoice file.
4. Click **Print Full-Page A4** to print an official paper invoice for delivery.

### 7.5 Voiding an Invoice & Reversing Sales Entries
If an invoice was issued in error or a print job was cancelled:
1. Open the invoice details view.
2. Click **Void Invoice**.
3. Enter the cancellation reason.
4. The system updates the status to `VOID`, zeroes out the customer's balance, and automatically posts a reversing General Ledger journal.

---

## 8. Customer Payments & AR Settlement Hub

Located under **Finance → Customer Payments**, this hub manages incoming customer funds, settles outstanding invoices, tracks cheque clearance, and issues official receipts.

### 8.1 Collecting & Recording Customer Payments
1. Click **Record Payment Receipt**.
2. Enter the Customer Name and the exact **Amount Paid (GHS)**.
3. Select the **Target Deposit Account**:
   - `GCB Bank (1002)` — Direct bank transfers or bank-cleared cheques
   - `Ecobank (1003)` — Operating transfers
   - `Main Cash (1001)` — Cash office payments
4. Select the **Payment Method**: Bank Transfer, Cheque, Cash, or Mobile Money (MoMo).
5. Enter the reference details: Cheque number, bank transfer reference, or MoMo transaction ID.
6. Select the **Settled Invoice Number** to allocate this payment to a specific invoice.
7. Click **Record Payment & Post GL**.

The system immediately updates the General Ledger:
- **Debit:** Chosen Bank or Cash Account (`#1001`, `#1002`, or `#1003`)
- **Credit:** Trade Receivables (`#1100`)
- The invoice balance is reduced accordingly. When paid in full, the invoice status changes to `PAID`.

### 8.2 Payment Methods & Bank Clearance Rules
- **Cash, Bank Transfers, and MoMo:** Marked as `CLEARED` immediately upon recording.
- **Cheques:** Recorded with status `PENDING` until clearance is verified through the bank statement.

### 8.3 Cheque Clearance & Bank Verification
1. When your bank statement confirms that a deposited cheque has cleared, go to **Finance → Customer Payments**.
2. Locate the payment in the register.
3. Click **Clear Bank** in the Actions column. The status changes from `PENDING` to `CLEARED`.

### 8.4 Generating & Printing Official Payment Receipts
1. Click **Receipt** beside any payment row.
2. The official **Ghana Publishing Company Ltd Official Receipt** opens with TIN details, customer name, payment method, allocated invoice number, and verified amount.
3. Click **Print Official Receipt** to print an official receipt for the customer.

---

## 9. Bank Reconciliation Workspace

Located under **Accounting → Bank Reconciliation**, this workspace correlates external bank statements with GPCL's internal General Ledger accounts.

### 9.1 Multi-Bank Operations (GCB Bank & Ecobank)
- **Account 1002:** GCB Bank - Operating Account
- **Account 1003:** Ecobank - Operational Account

Click on either bank card to switch between accounts and view live General Ledger balances.

### 9.2 Uploading Your Bank Statement File (CSV)
1. Select the appropriate bank account card.
2. Click **Upload CSV Statement**.
3. Choose the CSV statement file exported from your bank portal (containing `Date`, `Description`, `Debit`, `Credit`, and `Balance` columns).
4. Click **Ingest & Auto-Match Statement**.

### 9.3 Automated Transaction Matching
The matching engine correlates statement rows with internal payment records by reference number, date, and amount. Matched items are tagged as <span class="badge badge-green">CLEARED</span>.

### 9.4 Resolving Variances (Bank Charges, Interest Credits)
Items that appear on the bank statement but are not yet recorded in the ledger (e.g., monthly bank maintenance charges, ledger fees, wire charges) remain tagged as <span class="badge badge-amber">UNMATCHED</span>:
1. Click **Resolve Variance** next to the item.
2. Confirm the adjustment type (e.g., *Bank Charge Account #6300*).
3. The system generates an adjusting General Ledger entry and updates the transaction to `CLEARED`.

---

## 10. Fiscal Budgets vs. Actual Expenditure Control

Located under **Accounting → Budgets vs. Actuals**, this module monitors departmental spending against approved allocations.

### 10.1 Expense Budget Allocation
Annual and quarterly spending allowances are assigned per expense account code:
- **`#5001`:** Cost of Goods Sold (Raw Paper Stock, Inks, Plates)
- **`#6100`:** Staff Salaries & Wages
- **`#6200`:** Utilities & Power Consumption
- **`#6300`:** Freight & Logistics

### 10.2 Monitoring Budget Consumption & Variances
The budget table displays:
- **Annual Budget (GHS):** Approved spending ceiling.
- **Actual Spent (GHS):** Cumulative debits posted to this expense code.
- **Variance (GHS):** Budget minus Actual.
  - Green (+): Favorable variance (under budget).
  - Red (-): Unfavorable variance (over budget).
- **Consumption %:** Progress bar illustrating percent consumed.

---

## 11. Fiscal Period Close & Financial Year Lock

Located under **Accounting → Fiscal Period Close**, this module protects historical financial statements from unauthorized modifications.

### 11.1 Purpose of Period Locking
Once monthly management accounts or annual audited statements are finalized, the fiscal period must be locked. Locking prevents backdating, editing, or deleting transactions within that period.

### 11.2 Monthly Close Checklist
Before locking a period:
- [ ] Confirm all customer sales invoices for the month have been generated.
- [ ] Verify that all customer payments received have been recorded and cleared.
- [ ] Complete the monthly bank reconciliation for GCB Bank and Ecobank.
- [ ] Post all standard month-end adjustments (depreciation, accruals, prepayments).
- [ ] Verify that the Trial Balance is in balance ($\text{Debits} = \text{Credits}$).

### 11.3 Step-by-Step Guide to Locking a Period
1. Navigate to **Accounting → Fiscal Period Close**.
2. Locate the period (e.g., `2026-09` for September 2026).
3. Click **Lock Period**.
4. The status changes to `LOCKED`, and the closing officer's email is stamped onto the record.

### 11.4 Reopening a Locked Period for Audit Adjustments
Only a **Finance Administrator** can unlock a closed period to post verified external audit adjustments. Once adjustments are complete, the period must be locked again immediately.

---

## 12. Ghana Statutory Tax & Levy Returns (GRA)

Located under **Accounting → Ghana GRA Tax Returns**, this module compiles statutory filing returns for the **Ghana Revenue Authority (GRA)**.

### 12.1 GRA Statutory Deadlines
Under Ghana tax law, VAT, NHIL, and GETFund returns must be submitted and paid by the **15th day of the month following the assessment period**.

### 12.2 Monthly VAT, NHIL, and GETFund Computation
The summary dashboard provides live liability calculations:
- **VAT Payable (15%):** Value Added Tax on commercial printing and gazette sales.
- **NHIL Payable (2.5%):** National Health Insurance Levy.
- **GETFund Payable (2.5%):** Ghana Education Trust Fund.
- **Total Tax Liability:** Combined sum payable to the GRA.

### 12.3 Exporting Official GRA Tax Returns
1. Click **Export GRA Return PDF** at the top right of the page.
2. An official tax return schedule is generated, formatted with GPCL's corporate TIN (`C0014892014`), ready for submission to the GRA Large Taxpayer Office (LTO).

---

## 13. Financial Reports & Statements

Located under **Accounting → Financial Reports**, this module generates primary financial statements in real time.

### 13.1 Trial Balance Statement
Lists all active accounts in the Chart of Accounts with their closing Debit and Credit balances. A green banner confirms that the General Ledger is in balance:
$$\text{Total Debits} = \text{Total Credits} = \text{GHS 1,064,200.00}$$

### 13.2 Day Book (Daily Transaction Register)
Provides a chronological listing of every voucher posted on the selected date, categorized by voucher number, transaction type, account, debit, and credit.

### 13.3 Profit & Loss Statement (Income Statement)
Presents GPCL's operational performance:
- **Gross Operating Revenue:** Total invoiced commercial printing and gazette publications.
- **Less: Cost of Goods Sold (COGS):** Direct raw material and production expenses.
- **Gross Profit Margin:** Revenue minus COGS (with margin percentage).
- **Less: Operating Expenses:** Salaries, utilities, freight, maintenance.
- **Net Operating Profit Before Tax:** Final operating profit available for transfer to retained earnings.

### 13.4 Balance Sheet (Statement of Financial Position)
Formatted according to standard accounting principles:
- **Assets:** Cash accounts, bank balances, trade receivables, finished goods inventory, raw paper stock. Total Assets are summed.
- **Liabilities & Equity:** Accounts payable, VAT/NHIL/GETFund payable, stated capital, and retained earnings.
- Confirms the fundamental accounting equation:
  $$\text{Total Assets} = \text{Total Liabilities} + \text{Total Equity}$$

### 13.5 Accounts Receivable Aging Analysis
Classifies outstanding customer balances by delinquency:
- **Current (0 – 30 Days):** Standard payment terms (green).
- **31 – 60 Days:** Follow-up required (yellow).
- **61 – 90 Days:** Overdue credit alert (orange).
- **90+ Days:** High-risk credit restriction (red).

### 13.6 Exporting to PDF, Excel (XLSX), and CSV Formats
Every report can be exported in three formats using the buttons at the top right:
- **PDF Export:** Formal, print-ready document with official company headers and totals.
- **Excel (XLSX):** Formatted spreadsheet for financial modeling and analysis.
- **CSV Data:** Delimited data file for external reporting tools.

---

## 14. Staff Roles, Permissions & Security Audit

### 14.1 Finance Department User Roles
The system provides four standard enterprise roles:
1. **Finance Administrator (`ADMIN`):** Unrestricted access across all financial, accounting, administrative, and configuration modules.
2. **Senior Accountant (`SENIOR_ACCOUNTANT`):** Access to all accounting, voucher posting, journal entry, bank reconciliation, and reporting features. Cannot alter security configurations.
3. **Accounts Receivable Clerk (`ACCOUNTS_RECEIVABLE_CLERK`):** Dedicated access to invoice creation, payment recording, customer management, and receipt issuance.
4. **Financial Auditor (`AUDITOR`):** Read-only access to all statements, journals, and audit trails.

### 14.2 Managing Staff Accounts & Resetting Passwords
Under **Admin → User Management**:
- **Add User:** Click **Add New User**, enter staff details, assign an appropriate role, and establish an initial password.
- **Reset Password:** Open **Edit Account**, enter the new password in the password field, and click **Save Changes**.
- **Deactivate User:** Click **Deactivate** to revoke system access immediately when a staff member changes roles or departs.

### 14.3 Reviewing the Financial Audit Trail (Activity Logs)
Under **Admin → System Audit Logs**:
- Every financial event (voucher posting, invoice generation, payment receipt, period close, login) is recorded with the user's name, action, module, date, time, and details of modified values.

### 14.4 Financial Policies & Organization Settings
Under **Admin → System Settings**:
- Maintain corporate details: Registered name, Tax Identification Number (TIN), default currency (GHS), and fiscal year start date.
- Configure official statutory tax rates (VAT, NHIL, GETFund, WHT).
- Manage posting tolerance thresholds and inventory auto-posting settings.

---

## 15. Financial Troubleshooting & Frequently Asked Questions (FAQ)

### Q1: The system displays "Unbalanced Journal Error" and will not let me post.
**Resolution:** Verify that the sum of all debits exactly equals the sum of all credits. The system requires equality to within 0.001 GHS (1 pesewa). Check each line item for missing or incorrect amounts.

### Q2: Why did my invoice posting fail with "Closed Period Error"?
**Resolution:** The invoice date falls within an accounting month that has already been locked. Verify that the invoice date is correct. If an entry must be posted into a prior period, an authorized Finance Administrator must temporarily unlock the period under **Accounting → Fiscal Period Close**.

### Q3: Why can't I post a direct journal entry to Account #1100 (Trade Receivables)?
**Resolution:** Account `#1100` is a protected **Control Account**. Manual journal entries to control accounts are blocked to prevent discrepancies between the General Ledger and customer balances. Use the **Invoices** or **Customer Payments** modules instead.

### Q4: An invoice was issued with incorrect quantities or rates. How do I correct it?
**Resolution:** Open the invoice in **Finance → Invoices & AR** and click **Void Invoice**. Enter the cancellation reason. The system will mark the invoice as `VOID`, reverse the receivables and revenue balances in the General Ledger, and allow you to issue a corrected invoice.

### Q5: A customer paid by cheque, but our bank balance hasn't increased. Why?
**Resolution:** Cheque receipts are initially recorded with status `PENDING`. Once your bank statement confirms that the cheque has cleared, navigate to **Finance → Customer Payments** and click **Clear Bank** to reflect the funds in your liquid bank balance.

### Q6: How do I generate an official VAT Return schedule for the GRA?
**Resolution:** Navigate to **Accounting → Ghana GRA Tax Returns** and click **Export GRA Return PDF**. The system will generate a formatted statutory tax return with your corporate TIN ready for submission.

---

*End of Operations & User Manual — Ghana Publishing Company Limited (GPCL)*
