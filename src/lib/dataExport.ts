import * as XLSX from 'xlsx';

export interface ExportData {
  sheetName: string;
  columns: string[];
  data: any[][];
  totals?: { [key: string]: any };
}

/**
 * Generate Excel workbook with multiple sheets
 */
export function generateExcel(sheets: ExportData[]): Buffer {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, columns, data, totals }) => {
    // Prepare data with headers
    const tableData = [columns, ...data];

    // Add totals row if provided
    if (totals) {
      const totalsRow = columns.map((col, idx) => {
        return totals[col] !== undefined ? totals[col] : '';
      });
      tableData.push(totalsRow);
    }

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(tableData);

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = columns.map((col) => Math.min(col.length + 2, maxWidth));
    worksheet['!cols'] = colWidths.map((w) => ({ wch: w }));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  // Generate buffer
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return buffer as Buffer;
}

/**
 * Generate CSV content
 */
export function generateCSV(columns: string[], data: any[][], totals?: { [key: string]: any }): string {
  const rows: string[] = [];

  // Header row
  rows.push(columns.map((col) => `"${col}"`).join(','));

  // Data rows
  data.forEach((row) => {
    rows.push(row.map((val) => {
      if (val === null || val === undefined) return '""';
      return `"${val}"`;
    }).join(','));
  });

  // Totals row
  if (totals) {
    const totalsRow = columns.map((col) => {
      const val = totals[col];
      if (val === null || val === undefined) return '""';
      return `"${val}"`;
    });
    rows.push(totalsRow.join(','));
  }

  return rows.join('\n');
}

/**
 * Format currency for export
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  return `GHS ${amount.toFixed(decimals)}`;
}

/**
 * Format date for export
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/**
 * Prepare invoice data for export
 */
export function prepareInvoiceExport(
  invoices: any[]
): { columns: string[]; data: any[][]; totals: { [key: string]: any } } {
  const columns = [
    'Invoice #',
    'Client',
    'Invoice Date',
    'Due Date',
    'Net Amount',
    'VAT',
    'NHIS',
    'GETFund',
    'Total',
    'Balance Due',
    'Status',
  ];

  const data = invoices.map((inv) => [
    inv.InvoiceNumber,
    inv.ClientName || inv.ClientId,
    formatDate(inv.InvoiceDate),
    formatDate(inv.DueDate),
    formatCurrency(inv.SubTotal),
    formatCurrency(inv.VatAmount),
    formatCurrency(inv.NhisAmount),
    formatCurrency(inv.GetfundAmount),
    formatCurrency(inv.TotalAmount),
    formatCurrency(inv.BalanceDue),
    inv.Status,
  ]);

  const totals = {
    'Net Amount': formatCurrency(invoices.reduce((sum, inv) => sum + inv.SubTotal, 0)),
    VAT: formatCurrency(invoices.reduce((sum, inv) => sum + inv.VatAmount, 0)),
    NHIS: formatCurrency(invoices.reduce((sum, inv) => sum + inv.NhisAmount, 0)),
    GETFund: formatCurrency(invoices.reduce((sum, inv) => sum + inv.GetfundAmount, 0)),
    Total: formatCurrency(invoices.reduce((sum, inv) => sum + inv.TotalAmount, 0)),
    'Balance Due': formatCurrency(invoices.reduce((sum, inv) => sum + inv.BalanceDue, 0)),
  };

  return { columns, data, totals };
}

/**
 * Prepare payment data for export
 */
export function preparePaymentExport(
  payments: any[]
): { columns: string[]; data: any[][]; totals: { [key: string]: any } } {
  const columns = ['Payment #', 'Client', 'Invoice #', 'Payment Date', 'Amount', 'Method', 'Reference'];

  const data = payments.map((pay) => [
    pay.PaymentNumber,
    pay.ClientName || pay.ClientId,
    pay.InvoiceNumber || pay.InvoiceId,
    formatDate(pay.PaymentDate),
    formatCurrency(pay.Amount),
    pay.PaymentMethod,
    pay.Reference || '',
  ]);

  const totals = {
    Amount: formatCurrency(payments.reduce((sum, pay) => sum + pay.Amount, 0)),
  };

  return { columns, data, totals };
}

/**
 * Prepare GL data for export
 */
export function prepareGLExport(
  accounts: any[]
): { columns: string[]; data: any[][]; totals: { [key: string]: any } } {
  const columns = ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit', 'Balance'];

  const data = accounts.map((acc) => {
    const debit = Number(acc.TotalDebit);
    const credit = Number(acc.TotalCredit);
    const balance = debit - credit;

    return [
      acc.AccountCode,
      acc.AccountName,
      acc.AccountType,
      formatCurrency(debit),
      formatCurrency(credit),
      formatCurrency(balance),
    ];
  });

  const totalDebit = accounts.reduce((sum, acc) => sum + Number(acc.TotalDebit), 0);
  const totalCredit = accounts.reduce((sum, acc) => sum + Number(acc.TotalCredit), 0);

  const totals = {
    Debit: formatCurrency(totalDebit),
    Credit: formatCurrency(totalCredit),
    Balance: formatCurrency(totalDebit - totalCredit),
  };

  return { columns, data, totals };
}
