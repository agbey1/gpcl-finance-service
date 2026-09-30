import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFExportOptions {
  title: string;
  filename: string;
  reportDate: string;
  columns: string[];
  data: any[][];
  totals?: { [key: string]: any };
}

/**
 * Generate PDF report with table layout
 */
export function generatePDF(options: PDFExportOptions): Buffer {
  const { title, filename, reportDate, columns, data, totals } = options;

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Header
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  doc.setFontSize(10);
  doc.text(`Report Date: ${reportDate}`, 14, 22);
  doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, 14, 27);

  // Table
  autoTable(doc, {
    head: [columns],
    body: data,
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 35, right: 14, bottom: 14, left: 14 },
  });

  // Totals section (if provided)
  if (totals) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    let yOffset = finalY;
    Object.entries(totals).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, yOffset);
      yOffset += 6;
    });
  }

  // Footer
  const pageCount = (doc as any).internal.pages.length - 1;
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.getHeight() - 10);
  }

  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer);
}

/**
 * Generate Financial Statement PDF
 */
export function generateFinancialStatementPDF(
  title: string,
  reportDate: string,
  incomeStatement: { totalRevenue: number; totalExpense: number; netProfit: number },
  balanceSheet: {
    totalAssets: number;
    totalLiabilities: number;
    statedCapitalAndEquities: number;
    retainedEarnings: number;
    isBalanced: boolean;
  }
): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header
  doc.setFontSize(16);
  doc.text('Financial Statements', 14, 15);

  doc.setFontSize(10);
  doc.text(`Report Date: ${reportDate}`, 14, 22);

  // Income Statement Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Income Statement', 14, 35);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  let yOffset = 42;
  const incomeData = [
    ['Total Revenue', `GHS ${incomeStatement.totalRevenue.toFixed(2)}`],
    ['Total Expense', `GHS ${incomeStatement.totalExpense.toFixed(2)}`],
    ['Net Profit', `GHS ${incomeStatement.netProfit.toFixed(2)}`],
  ];

  incomeData.forEach(([label, value]) => {
    doc.text(label, 14, yOffset);
    doc.text(value, 150, yOffset, { align: 'right' });
    yOffset += 7;
  });

  // Balance Sheet Section
  yOffset += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Balance Sheet', 14, yOffset);

  yOffset += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const balanceData = [
    ['Assets', `GHS ${balanceSheet.totalAssets.toFixed(2)}`],
    ['Liabilities', `GHS ${balanceSheet.totalLiabilities.toFixed(2)}`],
    ['Equity', `GHS ${balanceSheet.statedCapitalAndEquities.toFixed(2)}`],
    ['Retained Earnings', `GHS ${balanceSheet.retainedEarnings.toFixed(2)}`],
    [
      'Total Liabilities & Equity',
      `GHS ${(balanceSheet.totalLiabilities + balanceSheet.statedCapitalAndEquities + balanceSheet.retainedEarnings).toFixed(2)}`,
    ],
  ];

  balanceData.forEach(([label, value]) => {
    doc.text(label, 14, yOffset);
    doc.text(value, 150, yOffset, { align: 'right' });
    yOffset += 7;
  });

  // Verification
  yOffset += 10;
  doc.setFont('helvetica', 'bold');
  const status = balanceSheet.isBalanced ? 'BALANCED ✓' : 'UNBALANCED ✗';
  doc.text(`GL Status: ${status}`, 14, yOffset);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toISOString()}`, 14, doc.internal.pageSize.getHeight() - 10);

  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer);
}
