const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const logoPath = path.join(rootDir, 'logo.jpg');
let logoBase64 = '';
if (fs.existsSync(logoPath)) {
  const logoBytes = fs.readFileSync(logoPath);
  logoBase64 = `data:image/jpeg;base64,${logoBytes.toString('base64')}`;
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GPCL Finance & Accounting System - Operations & User Manual</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
      @bottom-right {
        content: "Page " counter(page);
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
      @bottom-left {
        content: "Ghana Publishing Company Limited • Finance & Accounts Directorate";
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }

    @page:first {
      margin: 0;
      @bottom-right { content: none; }
      @bottom-left { content: none; }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    /* COVER PAGE */
    .cover-page {
      page-break-after: always;
      height: 297mm;
      width: 210mm;
      background: linear-gradient(135deg, #001730 0%, #002b55 50%, #003870 100%);
      color: #ffffff;
      padding: 32mm 22mm;
      display: flex;
      flex-direction: column;
      justifyContent: space-between;
      position: relative;
      overflow: hidden;
    }

    .cover-accent-circle-1 {
      position: absolute;
      top: -100px;
      right: -100px;
      width: 350px;
      height: 350px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(250, 175, 0, 0.25) 0%, rgba(0,0,0,0) 70%);
    }

    .cover-accent-circle-2 {
      position: absolute;
      bottom: -150px;
      left: -150px;
      width: 450px;
      height: 450px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 102, 204, 0.3) 0%, rgba(0,0,0,0) 70%);
    }

    .cover-header {
      position: relative;
      z-index: 2;
    }

    .cover-logo-wrapper {
      width: 95px;
      height: 95px;
      border-radius: 18px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      padding: 6px;
      margin-bottom: 24px;
      border: 3px solid #faaf00;
    }

    .cover-logo-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .cover-company {
      font-size: 15pt;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #faaf00;
      margin-bottom: 4px;
    }

    .cover-division {
      font-size: 10.5pt;
      color: #94a3b8;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .cover-body {
      position: relative;
      z-index: 2;
      margin-top: 40px;
      margin-bottom: 40px;
    }

    .cover-title {
      font-size: 28pt;
      font-weight: 800;
      line-height: 1.15;
      color: #ffffff;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }

    .cover-subtitle {
      font-size: 12.5pt;
      color: #cbd5e1;
      line-height: 1.5;
      max-width: 540px;
      margin-bottom: 28px;
    }

    .cover-badge-row {
      display: flex;
      gap: 12px;
    }

    .cover-badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: 0.5px;
    }

    .cover-footer {
      position: relative;
      z-index: 2;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9pt;
      color: #94a3b8;
    }

    .cover-footer strong {
      color: #ffffff;
    }

    /* GENERAL PAGE STYLES */
    .page-break {
      page-break-after: always;
    }

    .avoid-break {
      page-break-inside: avoid;
    }

    h1, h2, h3, h4, h5 {
      color: #0f172a;
      font-weight: 700;
      margin-top: 1.2em;
      margin-bottom: 0.4em;
    }

    h1 {
      font-size: 15pt;
      border-bottom: 2px solid #003870;
      padding-bottom: 4px;
      margin-top: 0;
      color: #003870;
    }

    h2 {
      font-size: 12pt;
      color: #00478f;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }

    h3 {
      font-size: 10pt;
      color: #1e293b;
    }

    p {
      margin: 0.3em 0 0.7em 0;
      text-align: justify;
    }

    /* TABLE OF CONTENTS */
    .toc {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }

    .toc-title {
      font-size: 12pt;
      font-weight: 800;
      color: #003870;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 6px;
    }

    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 24px;
      row-gap: 6px;
      font-size: 9pt;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #cbd5e1;
      padding-bottom: 2px;
    }

    .toc-item span:first-child {
      font-weight: 600;
      color: #334155;
    }

    .toc-item span:last-child {
      color: #64748b;
      font-family: monospace;
    }

    /* CALLOUT BOXES */
    .callout {
      border-radius: 6px;
      padding: 10px 14px;
      margin: 10px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }

    .callout-info {
      background: #eff6ff;
      border-left: 4px solid #2563eb;
      color: #1e40af;
    }

    .callout-warning {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }

    .callout-success {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      color: #065f46;
    }

    .callout-danger {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
    }

    .callout-title {
      font-weight: 700;
      margin-bottom: 3px;
      display: block;
      text-transform: uppercase;
      font-size: 8pt;
      letter-spacing: 0.5px;
    }

    /* TABLES */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 14px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }

    th {
      background: #003870;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #002b55;
    }

    td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      color: #334155;
    }

    tr:nth-child(even) {
      background: #f8fafc;
    }

    td.right, th.right {
      text-align: right;
    }

    td.center, th.center {
      text-align: center;
    }

    /* BADGES & KEYS */
    kbd {
      display: inline-block;
      padding: 2px 6px;
      font-size: 7.5pt;
      font-weight: 700;
      color: #1e293b;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
      border-radius: 4px;
      font-family: monospace;
    }

    .badge {
      display: inline-block;
      padding: 2px 7px;
      font-size: 7pt;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }

    /* METRIC CARDS GRID */
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 8px 0 14px 0;
      page-break-inside: avoid;
    }

    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }

    .metric-label {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .metric-value {
      font-size: 11pt;
      font-weight: 800;
      color: #003870;
    }

    .metric-sub {
      font-size: 7pt;
      color: #10b981;
      margin-top: 2px;
      font-weight: 600;
    }

    ol, ul {
      margin: 0.3em 0 0.7em 0;
      padding-left: 20px;
    }

    li {
      margin-bottom: 3px;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-accent-circle-1"></div>
    <div class="cover-accent-circle-2"></div>

    <div class="cover-header">
      <div class="cover-logo-wrapper">
        <img src="${logoBase64}" alt="GPCL Logo">
      </div>
      <div class="cover-company">Ghana Publishing Company Ltd</div>
      <div class="cover-division">Assembly Press, Barnes Road, Accra • Finance & Accounts Directorate</div>
    </div>

    <div class="cover-body">
      <div class="cover-title">FINANCE & ACCOUNTING OPERATIONS MANUAL</div>
      <div class="cover-subtitle">
        Standard Operating Procedures for General Ledger Accounting, Fast Voucher Entry (F4–F9), Commercial Invoicing, Ghana Statutory Levies, Customer Settlements, Bank Reconciliation & Financial Statements
      </div>
      <div class="cover-badge-row">
        <div class="cover-badge">FINANCE STAFF EDITION</div>
        <div class="cover-badge">STANDARD OPERATING PROCEDURE</div>
        <div class="cover-badge">FY 2026 / 2027</div>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <strong>Prepared For:</strong> Finance Directorate, Chief Accountants & Audit Staff<br>
        <strong>Compliance:</strong> Ghana Revenue Authority (GRA) Tax Act & IFRS<br>
        <strong>Head Office:</strong> Assembly Press, Barnes Road, Accra, Ghana
      </div>
      <div style="text-align: right;">
        <strong>Document Status:</strong><br>
        Official Standard Operating Procedure<br>
        Approved for Financial Operations
      </div>
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <div class="toc avoid-break" style="margin-top: 10px;">
    <div class="toc-title">Table of Contents — Finance & Accounts Manual</div>
    <div class="toc-grid">
      <div class="toc-item"><span>1. System Overview & Financial Principles</span><span>Page 2</span></div>
      <div class="toc-item"><span>9. Bank Reconciliation Workspace</span><span>Page 7</span></div>
      <div class="toc-item"><span>2. User Access & Security</span><span>Page 2</span></div>
      <div class="toc-item"><span>10. Fiscal Budgets vs. Actuals</span><span>Page 8</span></div>
      <div class="toc-item"><span>3. Financial Overview Dashboard</span><span>Page 3</span></div>
      <div class="toc-item"><span>11. Fiscal Period Close & Year Lock</span><span>Page 8</span></div>
      <div class="toc-item"><span>4. Voucher Entry Workspace (F4–F9)</span><span>Page 4</span></div>
      <div class="toc-item"><span>12. Ghana Statutory Tax Returns (GRA)</span><span>Page 9</span></div>
      <div class="toc-item"><span>5. Chart of Accounts & Opening Balances</span><span>Page 5</span></div>
      <div class="toc-item"><span>13. Financial Reports & Statements</span><span>Page 10</span></div>
      <div class="toc-item"><span>6. Journal Entries Register & Audit</span><span>Page 5</span></div>
      <div class="toc-item"><span>14. Staff Roles & Financial Audit Trail</span><span>Page 11</span></div>
      <div class="toc-item"><span>7. Commercial Invoicing & AR</span><span>Page 6</span></div>
      <div class="toc-item"><span>15. Troubleshooting & Accounts FAQ</span><span>Page 12</span></div>
      <div class="toc-item"><span>8. Customer Payments & Settlements</span><span>Page 7</span></div>
    </div>
  </div>

  <!-- SECTION 1 -->
  <h1>1. System Overview & Financial Principles</h1>
  <p>
    The <strong>GPCL Finance & Accounting System</strong> is the official accounting platform of <strong>Ghana Publishing Company Limited (Assembly Press)</strong>. It provides complete accounting governance for commercial print jobs, gazette notices, raw materials stock, supplier payments, customer credit management, statutory Ghana taxes, and executive reporting.
  </p>

  <div class="callout callout-info">
    <span class="callout-title">Four Core Accounting Safeguards</span>
    <strong>1. Double-Entry Balance:</strong> Every voucher and journal entry requires total Debits to equal total Credits to the exact pesewa. Unbalanced entries are rejected.<br>
    <strong>2. Control Account Integrity:</strong> Key control accounts (Trade Receivables #1100, Trade Payables #2001, Material Inventory #1202) cannot receive direct manual journal entries. They update automatically through business transactions to prevent discrepancies.<br>
    <strong>3. Ghana Tax Compliance:</strong> Invoices automatically apply the Ghana statutory levies (15% VAT, 2.5% NHIL, 2.5% GETFund — totaling 20% on net selling price).<br>
    <strong>4. Period Lock Protection:</strong> Closed financial periods reject backdated postings to maintain audit compliance.
  </div>

  <!-- SECTION 2 -->
  <h1>2. User Access & Security</h1>
  <p>
    Access to the financial portal is restricted to authorized personnel. Each staff member logs in using their corporate email and confidential password.
  </p>
  <ul>
    <li><strong>Signing In:</strong> Navigate to the finance portal login screen, enter your corporate email (e.g., <code>sadjei@gpcl.com</code>) and password, then click <strong>Sign In</strong>.</li>
    <li><strong>Confidentiality:</strong> Never share your password. Every invoice generated, payment collected, or voucher posted is permanently linked to your individual user account.</li>
    <li><strong>Automatic Session Timeout:</strong> For security, your session locks after <strong>8 hours</strong> of inactivity. Sign in again to resume your work without losing saved records.</li>
  </ul>

  <!-- SECTION 3 -->
  <div class="page-break"></div>
  <h1>3. Financial Overview Dashboard</h1>
  <p>
    The Financial Dashboard gives senior management, Chief Accountants, and financial controllers real-time visibility into GPCL's trading performance and cash balances.
  </p>

  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-label">Trade Receivables (AR)</div>
      <div class="metric-value">GHS 248,500.00</div>
      <div class="metric-sub">+12.4% vs last month</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Gross Operating Profit</div>
      <div class="metric-value">GHS 330,000.00</div>
      <div class="metric-sub">51.5% Gross Margin</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Ghana Levies (VAT/NHIL)</div>
      <div class="metric-value">GHS 49,700.00</div>
      <div class="metric-sub" style="color:#f59e0b;">15% VAT | 2.5% NHIL | 2.5% GET</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Operating Bank Balance</div>
      <div class="metric-value">GHS 277,500.00</div>
      <div class="metric-sub" style="color:#0284c7;">GCB Bank & Ecobank</div>
    </div>
  </div>

  <h2>Key Dashboard Features</h2>
  <ul>
    <li><strong>Monthly Revenue vs. Cost of Goods Sold (COGS):</strong> Comparative bar chart illustrating monthly printing sales against direct paper stock and production costs.</li>
    <li><strong>Operational Expense Distribution:</strong> Visual breakdown tracking Paper Stock COGS (64%), Staff Salaries (10%), Ghana Levies (10%), Office Utilities (4%), and Freight Handling (3%).</li>
    <li><strong>Live General Ledger Activity:</strong> Real-time feed of the latest journal postings from store deliveries, invoices, customer receipts, and gazette checkout.</li>
    <li><strong>Financial Ratios:</strong> Automated liquidity analysis showing Current Ratio (<strong>2.45 : 1</strong>), Quick Ratio (<strong>1.82 : 1</strong>), and Debt-to-Equity Ratio (<strong>0.26 : 1</strong>).</li>
  </ul>

  <!-- SECTION 4 -->
  <h1>4. High-Speed Voucher Entry Workspace (F4 – F9)</h1>
  <p>
    Located under <strong>Accounting → Voucher Entry (F4-F9)</strong>, this workstation is built for rapid, mouse-free voucher data entry using standard accounting keyboard shortcuts.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 100px;">Shortcut</th>
        <th style="width: 140px;">Voucher Type</th>
        <th>When to Use This Voucher</th>
        <th>Typical General Ledger Accounts</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><kbd>F4</kbd></td>
        <td><strong>Contra Voucher</strong></td>
        <td>Cash deposits into bank, cash withdrawals, inter-bank transfers</td>
        <td>Dr Bank Account (1002) / Cr Main Cash (1001)</td>
      </tr>
      <tr>
        <td><kbd>F5</kbd></td>
        <td><strong>Payment Voucher</strong></td>
        <td>Disbursements for vendor bills, utilities, petty cash expenses</td>
        <td>Dr Office Utilities (6400) / Cr GCB Bank (1002)</td>
      </tr>
      <tr>
        <td><kbd>F6</kbd></td>
        <td><strong>Receipt Voucher</strong></td>
        <td>Direct cash or bank receipts not linked to an invoice (e.g., scrap sales)</td>
        <td>Dr GCB Bank (1002) / Cr Sundry Revenue (4200)</td>
      </tr>
      <tr>
        <td><kbd>F7</kbd></td>
        <td><strong>Journal Voucher</strong></td>
        <td>Non-cash accounting adjustments, accruals, depreciation, corrections</td>
        <td>Dr Depreciation / Cr Accumulated Depreciation</td>
      </tr>
      <tr>
        <td><kbd>F8</kbd></td>
        <td><strong>Sales Voucher</strong></td>
        <td>Direct commercial sales and gazette publishing transactions</td>
        <td>Dr Trade Receivables (1100) / Cr Printing Revenue (4001)</td>
      </tr>
      <tr>
        <td><kbd>F9</kbd></td>
        <td><strong>Purchase Voucher</strong></td>
        <td>Materials stock purchases, raw paper reels, and supplier credit purchases</td>
        <td>Dr Paper Stock Inventory (1202) / Cr Accounts Payable (2001)</td>
      </tr>
      <tr>
        <td><kbd>Ctrl+F8</kbd></td>
        <td><strong>Credit Note</strong></td>
        <td>Customer price allowances, returned printing, billing adjustments</td>
        <td>Dr Sales Returns (4200) / Cr Trade Receivables (1100)</td>
      </tr>
      <tr>
        <td><kbd>Ctrl+F9</kbd></td>
        <td><strong>Debit Note</strong></td>
        <td>Returns of defective printing paper or consumables back to suppliers</td>
        <td>Dr Accounts Payable (2001) / Cr Paper Stock Inventory (1202)</td>
      </tr>
    </tbody>
  </table>

  <div class="callout callout-warning">
    <span class="callout-title">Double-Entry Balance Verification</span>
    The voucher submission button activates only when total Debits equal total Credits. The footer displays a real-time status banner: <span class="badge badge-green">✓ DOUBLE ENTRY BALANCED</span> or <span class="badge badge-red">⚠ UNBALANCED VOUCHER</span>.
  </div>

  <!-- SECTION 5 -->
  <div class="page-break"></div>
  <h1>5. Chart of Accounts & Opening Balances</h1>
  <p>
    The Chart of Accounts (<strong>Accounting → Chart of Accounts</strong>) is organized using a standardized 4-digit hierarchy:
  </p>

  <table>
    <thead>
      <tr>
        <th>Code Series</th>
        <th>Category</th>
        <th>Normal Balance</th>
        <th>Key GPCL Accounts</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1000 – 1999</strong></td>
        <td><span class="badge badge-blue">ASSET</span></td>
        <td>Debit</td>
        <td>1001 Main Cash, 1002 GCB Bank, 1003 Ecobank, 1100 AR, 1201 Finished Goods, 1202 Paper Stock Inventory</td>
      </tr>
      <tr>
        <td><strong>2000 – 2999</strong></td>
        <td><span class="badge badge-amber">LIABILITY</span></td>
        <td>Credit</td>
        <td>2001 Accounts Payable, 2100 VAT (15%), 2102 NHIL (2.5%), 2103 GETFund (2.5%), 2200 WHT, 2300 PAYE</td>
      </tr>
      <tr>
        <td><strong>3000 – 3999</strong></td>
        <td><span class="badge badge-blue">EQUITY</span></td>
        <td>Credit</td>
        <td>3001 Stated Capital, 3002 Retained Earnings, 3900 Opening Balance Clearing</td>
      </tr>
      <tr>
        <td><strong>4000 – 4999</strong></td>
        <td><span class="badge badge-green">REVENUE</span></td>
        <td>Credit</td>
        <td>4001 Commercial Printing Revenue, 4100 Gazette Publication Revenue, 4200 Sales Returns</td>
      </tr>
      <tr>
        <td><strong>5000 – 5999</strong></td>
        <td><span class="badge badge-red">COGS</span></td>
        <td>Debit</td>
        <td>5001 Cost of Goods Sold (Raw Paper Stock, Printing Inks, Binding Consumables)</td>
      </tr>
      <tr>
        <td><strong>6000 – 6999</strong></td>
        <td><span class="badge badge-red">EXPENSE</span></td>
        <td>Debit</td>
        <td>6100 Salaries & Wages, 6150 Freight, 6200 Scrap Loss, 6300 Bank Fees, 6400 Utilities & Power</td>
      </tr>
    </tbody>
  </table>

  <h3>Managing Opening Balances</h3>
  <ol>
    <li>Navigate to the Chart of Accounts list.</li>
    <li>Locate the target account and click <strong>Edit Opening</strong>.</li>
    <li>Input the audited starting balance in Ghana Cedis (GHS).</li>
    <li>Click <strong>Update Opening Balance</strong>. The General Ledger starting position is updated immediately.</li>
  </ol>

  <!-- SECTION 6 -->
  <h1>6. Journal Entries Register & Ledger Audit</h1>
  <p>
    The Journal Entries Register (<strong>Accounting → Journal Entries Register</strong>) records every transaction posted to the General Ledger.
  </p>

  <h2>Transaction Reversal Workflow (The Audit-Compliant Correction Method)</h2>
  <p>
    In compliance with standard accounting practices, posted entries are never deleted. When an entry must be cancelled:
  </p>
  <ol>
    <li>Locate the journal in the register (searchable by Entry #, Source Module, or Description).</li>
    <li>Click <strong>Reverse</strong> in the Actions column.</li>
    <li>The system marks the original journal status as <span class="badge badge-red">REVERSED</span> and automatically generates an inverse journal entry swapping all debits and credits, permanently linking the correction in the audit trail.</li>
  </ol>

  <!-- SECTION 7 -->
  <div class="page-break"></div>
  <h1>7. Commercial Invoicing & Accounts Receivable (AR)</h1>
  <p>
    The Invoicing module (<strong>Finance → Invoices & AR</strong>) manages commercial sales invoicing, client credit exposure, Ghana statutory tax calculations, recurring contracts, and print exports.
  </p>

  <h2>7.1 Ghana Statutory Tax & Levy Engine</h2>
  <p>
    Every commercial sales invoice issued by GPCL automatically applies the Ghana statutory levy breakdown:
  </p>
  <ul>
    <li><strong>Net Subtotal:</strong> $\sum (\text{Quantity} \times \text{Unit Selling Price})$</li>
    <li><strong>Value Added Tax (VAT):</strong> $\text{Net} \times 15.0\%$</li>
    <li><strong>National Health Insurance Levy (NHIL):</strong> $\text{Net} \times 2.5\%$</li>
    <li><strong>Ghana Education Trust Fund (GETFund):</strong> $\text{Net} \times 2.5\%$</li>
    <li><strong>Total Gross Amount Due:</strong> $\text{Net} \times 1.20$ (Total effective statutory levy: 20%)</li>
  </ul>

  <div class="callout callout-success">
    <span class="callout-title">Automatic General Ledger Posting Generated on Invoice Creation</span>
    <strong>Debit:</strong> Trade Receivables Account #1100 (Total Gross Amount)<br>
    <strong>Credit:</strong> Commercial Printing Revenue #4001 (Net Subtotal)<br>
    <strong>Credit:</strong> VAT Payable #2100 (15% Amount)<br>
    <strong>Credit:</strong> NHIS Payable #2102 (2.5% Amount)<br>
    <strong>Credit:</strong> GETFund Payable #2103 (2.5% Amount)
  </div>

  <h2>7.2 Step-by-Step: Creating a Commercial Invoice</h2>
  <ol>
    <li>Click <strong>Create New Invoice</strong> in the Invoices register.</li>
    <li>Select or type the <strong>Customer / Client Name</strong> (e.g., Ministry of Information, Graphic Communications, ECG).</li>
    <li>Add line items: specify Description, Quantity, and Unit Price in GHS. Click <strong>+ Add Item Row</strong> for additional items.</li>
    <li>Verify the automatic Ghana Statutory Tax Breakdown summary box.</li>
    <li><em>Optional:</em> Check <strong>Set as Recurring Invoice Schedule</strong> (Weekly, Monthly, Quarterly, Yearly) for standing publication agreements.</li>
    <li>Click <strong>Generate Commercial Invoice</strong>. The system assigns a sequential invoice number and updates the General Ledger.</li>
  </ol>

  <h2>7.3 Invoice Printing & Vector PDF Download</h2>
  <p>
    Click <strong>View Invoice</strong> on any record to open the full-page A4 Commercial Invoice preview with official GPCL Assembly Press letterhead, corporate TIN (<code>C0014892014</code>), itemized table, and tax schedule. Click <strong>Download Vector PDF</strong> for digital dispatch, or <strong>Print Full-Page A4</strong> for physical printing.
  </p>

  <!-- SECTION 8 -->
  <div class="page-break"></div>
  <h1>8. Customer Payments & AR Settlement Hub</h1>
  <p>
    The Payment Settlement Hub (<strong>Finance → Customer Payments</strong>) handles receipt of incoming payments, allocation against open invoices, cheque clearance workflows, and official payment receipt generation.
  </p>

  <h2>8.1 Recording a Customer Payment</h2>
  <ol>
    <li>Click <strong>Record Payment Receipt</strong>.</li>
    <li>Select the Customer Name and enter the <strong>Amount Paid (GHS)</strong>.</li>
    <li>Choose the <strong>Target Deposit Account:</strong> GCB Bank Operating (1002), Ecobank Operational (1003), or Main Cash (1001).</li>
    <li>Select the <strong>Payment Method:</strong> Bank Transfer, Cheque, Cash, or Mobile Money (MoMo).</li>
    <li>Input the transaction reference / cheque number (e.g., <code>TRF-994102</code>).</li>
    <li>Select the <strong>Settled Invoice Number</strong> to allocate this payment to a specific invoice.</li>
    <li>Click <strong>Record Payment & Post GL</strong>.</li>
  </ol>

  <h2>8.2 Cheque Clearance Tracking</h2>
  <p>
    Payments made via cheque are initially flagged as <span class="badge badge-amber">PENDING</span>. Once bank statement confirmation is received, click <strong>Clear Bank</strong> to transition the record to <span class="badge badge-green">CLEARED</span>.
  </p>

  <h2>8.3 Official Payment Receipts</h2>
  <p>
    Click <strong>Receipt</strong> beside any payment to display the official <strong>Ghana Publishing Company Ltd Official Receipt</strong>, complete with TIN credentials, client details, payment method, allocated invoice number, and printable layout.
  </p>

  <!-- SECTION 9 -->
  <h1>9. Bank Reconciliation Workspace</h1>
  <p>
    Located under <strong>Accounting → Bank Reconciliation</strong>, this workspace correlates external bank statements with GPCL's internal General Ledger accounts.
  </p>

  <h2>Reconciliation Workflow</h2>
  <ol>
    <li>Select the target bank account: <strong>GCB Bank Operating (1002)</strong> or <strong>Ecobank Operational (1003)</strong>.</li>
    <li>Review the live General Ledger balance displayed on the account card.</li>
    <li>Click <strong>Upload CSV Statement</strong>. Select the CSV file exported from your bank portal (containing <code>Date</code>, <code>Narration</code>, <code>Debit</code>, <code>Credit</code>, and <code>Balance</code> columns).</li>
    <li>Click <strong>Ingest & Auto-Match Statement</strong>. The automated matching engine correlates statement items against payments by reference number, date, and amount.</li>
    <li>Matched transactions are marked <span class="badge badge-green">CLEARED</span>.</li>
    <li>For remaining items (such as bank service charges or interest earnings), click <strong>Resolve Variance</strong> to automatically generate an adjusting journal entry to account #6300 (Bank Service Charges).</li>
  </ol>

  <!-- SECTION 10 & 11 -->
  <div class="page-break"></div>
  <h1>10. Fiscal Budgets vs. Actual Expenditure Control</h1>
  <p>
    Accessible via <strong>Accounting → Budgets vs. Actuals</strong>, this module enables department heads and financial controllers to establish expenditure limits per General Ledger code and track consumption.
  </p>

  <table>
    <thead>
      <tr>
        <th>Account Code</th>
        <th>Expense Account Name</th>
        <th>Category</th>
        <th class="right">Annual Budget (GHS)</th>
        <th class="right">Actual Spent (GHS)</th>
        <th class="right">Variance (GHS)</th>
        <th>Consumption %</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>5001</strong></td>
        <td>Cost of Goods Sold (Paper Stock)</td>
        <td><span class="badge badge-blue">COGS</span></td>
        <td class="right">350,000.00</td>
        <td class="right">310,000.00</td>
        <td class="right" style="color: #059669; font-weight:700;">+40,000.00</td>
        <td>88.6% (On Track)</td>
      </tr>
      <tr>
        <td><strong>6100</strong></td>
        <td>Salaries & Staff Payroll Expenses</td>
        <td><span class="badge badge-blue">OPERATING</span></td>
        <td class="right">50,000.00</td>
        <td class="right">48,750.00</td>
        <td class="right" style="color: #059669; font-weight:700;">+1,250.00</td>
        <td>97.5% (On Track)</td>
      </tr>
      <tr>
        <td><strong>6200</strong></td>
        <td>Utilities & Power Expenses</td>
        <td><span class="badge badge-blue">OPERATING</span></td>
        <td class="right">15,000.00</td>
        <td class="right">18,500.00</td>
        <td class="right" style="color: #dc2626; font-weight:700;">-3,500.00</td>
        <td>123.3% (Over Budget)</td>
      </tr>
      <tr>
        <td><strong>6300</strong></td>
        <td>Freight & Stock Handling Costs</td>
        <td><span class="badge badge-blue">OPERATING</span></td>
        <td class="right">15,000.00</td>
        <td class="right">12,400.00</td>
        <td class="right" style="color: #059669; font-weight:700;">+2,600.00</td>
        <td>82.7% (On Track)</td>
      </tr>
    </tbody>
  </table>

  <h1>11. Fiscal Period Close & Financial Year Lock</h1>
  <p>
    Located under <strong>Accounting → Fiscal Period Close</strong>, this module locks accounting periods to prevent unauthorized retrospective entries into closed periods.
  </p>

  <div class="callout callout-danger">
    <span class="callout-title">Audit Rule: Closed Period Lock</span>
    Once a monthly period or financial year is closed, any subsequent attempt to post, edit, or reverse transactions within that date range is immediately rejected to safeguard audited management accounts.
  </div>

  <h2>Monthly Close Checklist</h2>
  <ol>
    <li>Confirm all customer sales invoices for the month have been generated.</li>
    <li>Verify that all customer payments received have been recorded and cleared.</li>
    <li>Complete the monthly bank reconciliation for GCB Bank and Ecobank.</li>
    <li>Post all standard month-end adjustments (depreciation, accruals, prepayments).</li>
    <li>Verify that the Trial Balance is in balance ($\text{Debits} = \text{Credits}$).</li>
    <li>Click <strong>Lock Period</strong> beside the target period (e.g., <code>2026-08</code>). The status updates to <span class="badge badge-amber">LOCKED</span>.</li>
  </ol>

  <!-- SECTION 12 -->
  <div class="page-break"></div>
  <h1>12. Ghana Statutory Tax & Levy Returns (GRA)</h1>
  <p>
    Accessible via <strong>Accounting → Ghana GRA Tax Returns</strong>, this module compiles monthly statutory filings for the <strong>Ghana Revenue Authority (GRA)</strong>.
  </p>

  <h2>Filing Requirements & Deadlines</h2>
  <p>
    Under the Ghana Value Added Tax Act, monthly VAT, NHIL, and GETFund returns must be filed and paid no later than the <strong>15th day of the month following the assessment period</strong>.
  </p>

  <table>
    <thead>
      <tr>
        <th>Filing Period</th>
        <th class="right">Taxable Net Sales (GHS)</th>
        <th class="right">VAT 15% (GHS)</th>
        <th class="right">NHIS 2.5% (GHS)</th>
        <th class="right">GETFund 2.5% (GHS)</th>
        <th class="right">Total Levies Payable (GHS)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>August 2026</strong></td>
        <td class="right">640,000.00</td>
        <td class="right">96,000.00</td>
        <td class="right">16,000.00</td>
        <td class="right">16,000.00</td>
        <td class="right" style="font-weight:700; color:#003870;">128,000.00</td>
        <td><span class="badge badge-amber">DUE</span></td>
      </tr>
      <tr>
        <td><strong>July 2026</strong></td>
        <td class="right">580,000.00</td>
        <td class="right">87,000.00</td>
        <td class="right">14,500.00</td>
        <td class="right">14,500.00</td>
        <td class="right" style="font-weight:700; color:#003870;">116,000.00</td>
        <td><span class="badge badge-green">FILED</span></td>
      </tr>
      <tr>
        <td><strong>June 2026</strong></td>
        <td class="right">480,000.00</td>
        <td class="right">72,000.00</td>
        <td class="right">12,000.00</td>
        <td class="right">12,000.00</td>
        <td class="right" style="font-weight:700; color:#003870;">96,000.00</td>
        <td><span class="badge badge-green">FILED</span></td>
      </tr>
    </tbody>
  </table>

  <p>
    Click <strong>Export GRA Return PDF</strong> at the top right of the screen to generate the official tax return schedule report, formatted with GPCL's corporate TIN (<code>C0014892014</code>) for submission to the GRA Large Taxpayer Office (LTO).
  </p>

  <!-- SECTION 13 -->
  <div class="page-break"></div>
  <h1>13. Financial Reports & Statements</h1>
  <p>
    The Financial Reports hub (<strong>Accounting → Financial Reports</strong>) provides live generation and multi-format export of GPCL's primary financial statements.
  </p>

  <h2>13.1 Available Report Types</h2>
  <ul>
    <li><strong>Trial Balance:</strong> Displays every active account in the Chart of Accounts with closing debit and credit balances, verifying that Total Debits equal Total Credits (GHS 1,064,200.00).</li>
    <li><strong>Day Book (Voucher Register):</strong> Itemized daily ledger displaying every voucher posted, categorized by type, reference, account, debit, and credit.</li>
    <li><strong>Profit & Loss Statement (Income Statement):</strong> Calculates Gross Operating Revenue minus Cost of Goods Sold to establish Gross Profit Margin (51.5%), followed by operating expense deductions to yield Net Operating Profit (GHS 281,250.00).</li>
    <li><strong>Balance Sheet (Financial Position):</strong> Displays the balance between Total Assets (GHS 704,450.00) and Total Liabilities & Equity (GHS 704,450.00).</li>
    <li><strong>Accounts Receivable Aging Analysis:</strong> Classifies customer receivables into 0-30 days, 31-60 days, 61-90 days, and 90+ days aging brackets.</li>
  </ul>

  <h2>13.2 Multi-Format Export Capabilities</h2>
  <p>
    Every report can be exported in three standard formats using the header buttons:
  </p>
  <ul>
    <li><strong>PDF Export:</strong> Formal vector PDF document featuring official company headers, page numbers, and calculated summary totals.</li>
    <li><strong>Excel (XLSX):</strong> Multi-column spreadsheet formatted for financial modeling, audit review, and formula verification.</li>
    <li><strong>CSV Data:</strong> Raw comma-separated data stream for importing into external business intelligence tools.</li>
  </ul>

  <!-- SECTION 14 -->
  <div class="page-break"></div>
  <h1>14. Staff Roles, Permissions & Security Audit</h1>

  <h2>14.1 Finance Department User Roles</h2>
  <ul>
    <li><strong>Finance Administrator:</strong> Unrestricted access across all financial, accounting, administrative, and configuration modules.</li>
    <li><strong>Senior Accountant:</strong> Full access to all ledger, voucher, reconciliation, tax, and reporting operations. Cannot alter administrative configurations.</li>
    <li><strong>Accounts Receivable Clerk:</strong> Dedicated access to customer invoicing, payment recording, client management, and official receipt issuance.</li>
    <li><strong>Financial Auditor:</strong> Read-only access across all general ledgers, journals, bank reconciliations, and immutable audit logs.</li>
  </ul>

  <h2>14.2 Role Permission Matrix</h2>

  <table>
    <thead>
      <tr>
        <th>Operational Scope</th>
        <th class="center">Admin</th>
        <th class="center">Senior Accountant</th>
        <th class="center">AR Clerk</th>
        <th class="center">Auditor</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>View General Ledger & Reports</td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
        <td class="center"><span class="badge badge-green">YES</span></td>
      </tr>
      <tr>
        <td>Post / Reverse Journal Entries</td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
      </tr>
      <tr>
        <td>Close & Lock Fiscal Periods</td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
      </tr>
      <tr>
        <td>Create Commercial Invoices</td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
      </tr>
      <tr>
        <td>Record Customer Payments</td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
      </tr>
      <tr>
        <td>Manage Bank Reconciliations</td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
      </tr>
      <tr>
        <td>View Immutable Activity Logs</td>
        <td class="center"><span class="badge badge-green">YES</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
        <td class="center"><span class="badge badge-red">NO</span></td>
        <td class="center"><span class="badge badge-green">YES</span></td>
      </tr>
    </tbody>
  </table>

  <h2>14.3 Financial Audit Trail (Admin → System Audit Logs)</h2>
  <p>
    Every financial event (voucher posting, invoice generation, payment receipt, period close, login) is recorded with the user's name, action, module, date, time, and details of modified values for comprehensive audit traceability.
  </p>

  <!-- SECTION 15 -->
  <div class="page-break"></div>
  <h1>15. Financial Troubleshooting & Frequently Asked Questions (FAQ)</h1>

  <div class="callout callout-warning">
    <span class="callout-title">Q1: Why is my voucher rejected with "Unbalanced Journal Error"?</span>
    Total debits must equal total credits to the exact pesewa. Check that all line items have valid numbers and that rounding differences do not exceed 1 pesewa.
  </div>

  <div class="callout callout-warning">
    <span class="callout-title">Q2: Why does the system return "Closed Period Error"?</span>
    The transaction date falls into an accounting month that has already been locked. Verify that the transaction date is correct. If an entry must be posted into a prior period, an authorized Finance Administrator must temporarily unlock the period under <strong>Accounting → Fiscal Period Close</strong>.
  </div>

  <div class="callout callout-warning">
    <span class="callout-title">Q3: Why can't I post a direct journal to Account #1100 (Trade Receivables)?</span>
    Account #1100 is a designated <strong>Control Account</strong>. Direct manual postings are blocked to keep the general ledger in sync with customer balances. Use the <strong>Invoices</strong> or <strong>Customer Payments</strong> modules instead.
  </div>

  <div class="callout callout-warning">
    <span class="callout-title">Q4: How do I void an invoice that was issued with incorrect quantities or rates?</span>
    Navigate to <strong>Finance → Invoices & AR</strong>, open the invoice detail modal, and click <strong>Void Invoice</strong>. Enter the cancellation reason. The system will mark the invoice as VOID, reset customer balances, and post an automated reversing General Ledger entry.
  </div>

  <div class="callout callout-warning">
    <span class="callout-title">Q5: A customer paid by cheque, but our bank balance hasn't increased. Why?</span>
    Cheque receipts are initially recorded with status PENDING. Once your bank statement confirms that the cheque has cleared, navigate to <strong>Finance → Customer Payments</strong> and click <strong>Clear Bank</strong> to reflect the funds in your liquid bank balance.
  </div>

  <div class="callout callout-warning">
    <span class="callout-title">Q6: How do I generate an official VAT Return schedule for the GRA?</span>
    Navigate to <strong>Accounting → Ghana GRA Tax Returns</strong> and click <strong>Export GRA Return PDF</strong>. The system will generate a formatted statutory tax return with your corporate TIN ready for submission.
  </div>

  <div style="margin-top: 40px; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 16px; font-size: 8.5pt; color: #64748b;">
    <strong>Ghana Publishing Company Limited (GPCL)</strong> • Assembly Press, Barnes Road, Accra, Ghana<br>
    Finance Directorate & Technical Accounts Support • Email: <code>admin@gpcl.com</code>
  </div>

</body>
</html>`;

const tempHtmlPath = path.join(rootDir, 'manual_print.html');
const outputPdfPath = path.join(rootDir, 'GPCL_Finance_User_Manual.pdf');

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');
console.log(`Wrote updated finance-focused HTML to ${tempHtmlPath}`);

const edgeExecutable = "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe";

console.log('Rendering PDF via Headless Edge...');
const cmd = `"${edgeExecutable}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outputPdfPath}" --no-pdf-header-footer "${tempHtmlPath}"`;
execSync(cmd, { stdio: 'inherit' });

if (fs.existsSync(outputPdfPath)) {
  const stats = fs.statSync(outputPdfPath);
  console.log(`SUCCESS! Generated PDF at: ${outputPdfPath}`);
  console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
} else {
  console.error('Failed to generate PDF!');
}
