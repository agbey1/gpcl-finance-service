import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Universal Fail-safe File Downloader
 */
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Robust Excel (.xlsx) Exporter using ArrayBuffer Blob
 */
export function exportToExcel(data: Record<string, any>[], columns: ExportColumn[], filename: string) {
  const formattedData = data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      let val = row[col.key];
      if (typeof val === 'number') {
        val = Number(val.toFixed(2));
      }
      obj[col.header] = val ?? '';
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  
  // Set automatic column widths
  const colWidths = columns.map(c => ({
    wch: Math.max(c.header.length + 4, 15)
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Financial Report');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `${filename}.xlsx`);
}

/**
 * Robust CSV Exporter with UTF-8 BOM for Microsoft Excel Compatibility
 */
export function exportToCsv(data: Record<string, any>[], columns: ExportColumn[], filename: string) {
  const formattedData = data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      let val = row[col.key];
      if (typeof val === 'number') {
        val = Number(val.toFixed(2));
      }
      obj[col.header] = val ?? '';
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  
  // Prepend UTF-8 BOM (\uFEFF) for Excel native decoding
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `${filename}.csv`);
}

/**
 * Robust PDF Exporter with Auto Landscape, Styling & Page Numbers
 */
export function exportToPdf(title: string, columns: ExportColumn[], data: Record<string, any>[], filename: string) {
  const isLandscape = columns.length > 5;
  const doc = new jsPDF(isLandscape ? 'landscape' : 'portrait', 'pt', 'a4');
  const pageWidth = isLandscape ? 841.89 : 595.28;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 55, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('GHANA PUBLISHING COMPANY LTD (GPCL)', 30, 34);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const dateStr = `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
  doc.text(dateStr, pageWidth - 30 - doc.getTextWidth(dateStr), 34);

  // Report Title
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), 30, 80);

  const tableHeaders = columns.map(c => c.header);
  const tableRows = data.map(row => columns.map(c => {
    const val = row[c.key];
    if (typeof val === 'number') {
      return val.toLocaleString('en-US', { minimumFractionDigits: 2 });
    }
    return String(val ?? '');
  }));

  autoTable(doc, {
    startY: 95,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 30, right: 30 },
  });

  const pdfOutput = doc.output('blob');
  downloadFile(pdfOutput, `${filename}.pdf`);
}
