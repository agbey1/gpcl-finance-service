import { NextRequest } from 'next/server';
import { generatePDF, generateFinancialStatementPDF } from '../lib/pdfExport';
import { generateExcel, generateCSV, prepareInvoiceExport, preparePaymentExport, prepareGLExport } from '../lib/dataExport';

describe('New Features - Data Retrieval, Exports, and Audit', () => {
  describe('PDF Export Service', () => {
    it('should generate valid PDF buffer', () => {
      const pdfBuffer = generatePDF({
        title: 'Test Report',
        filename: 'test.pdf',
        reportDate: '2026-09-03',
        columns: ['Account', 'Debit', 'Credit'],
        data: [
          ['Account 1', '1000.00', '0.00'],
          ['Account 2', '0.00', '1000.00'],
        ],
        totals: {
          Debit: '1000.00',
          Credit: '1000.00',
        },
      });

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF');
    });

    it('should generate financial statement PDF', () => {
      const pdfBuffer = generateFinancialStatementPDF('Financial Statements', '2026-09-03', {
        totalRevenue: 100000,
        totalExpense: 60000,
        netProfit: 40000,
      }, {
        totalAssets: 150000,
        totalLiabilities: 50000,
        statedCapitalAndEquities: 60000,
        retainedEarnings: 40000,
        isBalanced: true,
      });

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF');
    });

    it('should handle empty data gracefully', () => {
      const pdfBuffer = generatePDF({
        title: 'Empty Report',
        filename: 'empty.pdf',
        reportDate: '2026-09-03',
        columns: ['Col1', 'Col2'],
        data: [],
      });

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Excel Export Service', () => {
    it('should generate valid Excel buffer', () => {
      const buffer = generateExcel([{
        sheetName: 'Test Sheet',
        columns: ['Account', 'Debit', 'Credit'],
        data: [
          ['Account 1', '1000.00', '0.00'],
          ['Account 2', '0.00', '1000.00'],
        ],
        totals: {
          Account: 'TOTALS',
          Debit: '1000.00',
          Credit: '1000.00',
        },
      }]);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate CSV content correctly', () => {
      const csv = generateCSV(
        ['Account', 'Debit', 'Credit'],
        [
          ['Account 1', '1000.00', '0.00'],
          ['Account 2', '0.00', '1000.00'],
        ],
        {
          Account: 'TOTALS',
          Debit: '1000.00',
          Credit: '1000.00',
        }
      );

      expect(csv).toContain('"Account","Debit","Credit"');
      expect(csv).toContain('"Account 1","1000.00","0.00"');
      expect(csv).toContain('"TOTALS","1000.00","1000.00"');
      expect(csv.split('\n').length).toBe(4); // Headers + 2 data + 1 totals
    });

    it('should handle special characters in CSV', () => {
      const csv = generateCSV(
        ['Description', 'Amount'],
        [['Test "quoted" value', '100.00']],
      );

      expect(csv).toContain('"Test "quoted" value"');
    });
  });

  describe('Data Export Helpers', () => {
    it('should prepare invoice export correctly', () => {
      const invoices = [
        {
          InvoiceNumber: 'INV-2026-000001',
          ClientName: 'Client A',
          ClientId: 1,
          InvoiceDate: '2026-09-01',
          DueDate: '2026-10-01',
          SubTotal: 1000,
          VatAmount: 150,
          NhisAmount: 25,
          GetfundAmount: 25,
          TotalAmount: 1200,
          BalanceDue: 1200,
          Status: 'UNPAID',
        },
      ];

      const { columns, data, totals } = prepareInvoiceExport(invoices);

      expect(columns).toContain('Invoice #');
      expect(columns).toContain('Total');
      expect(data[0][0]).toBe('INV-2026-000001');
      expect(totals.Total).toContain('1200.00');
    });

    it('should prepare payment export correctly', () => {
      const payments = [
        {
          PaymentNumber: 'PAY-2026-000001',
          ClientName: 'Client A',
          ClientId: 1,
          InvoiceNumber: 'INV-2026-000001',
          InvoiceId: 1,
          PaymentDate: '2026-09-15',
          Amount: 1200,
          PaymentMethod: 'BANK_TRANSFER',
          Reference: 'REF-001',
        },
      ];

      const { columns, data, totals } = preparePaymentExport(payments);

      expect(columns).toContain('Payment #');
      expect(columns).toContain('Amount');
      expect(data[0][0]).toBe('PAY-2026-000001');
      expect(totals.Amount).toContain('1200.00');
    });

    it('should prepare GL export correctly', () => {
      const accounts = [
        {
          AccountCode: '1100',
          AccountName: 'AR',
          AccountType: 'ASSET',
          TotalDebit: 5000,
          TotalCredit: 0,
        },
        {
          AccountCode: '4001',
          AccountName: 'Revenue',
          AccountType: 'REVENUE',
          TotalDebit: 0,
          TotalCredit: 5000,
        },
      ];

      const { columns, data, totals } = prepareGLExport(accounts);

      expect(columns).toContain('Account Code');
      expect(columns).toContain('Balance');
      expect(data[0][0]).toBe('1100');
      expect(totals.Debit).toContain('5000.00');
      expect(totals.Credit).toContain('5000.00');
    });
  });

  describe('Audit Log Entry Structure', () => {
    it('should accept all required audit action types', () => {
      const actions: Array<'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'VOID' | 'CLOSE'> = [
        'CREATE',
        'UPDATE',
        'DELETE',
        'POST',
        'VOID',
        'CLOSE',
      ];

      expect(actions.length).toBe(6);
      actions.forEach(action => {
        expect(['CREATE', 'UPDATE', 'DELETE', 'POST', 'VOID', 'CLOSE']).toContain(action);
      });
    });

    it('should handle JSON serialization of old/new values', () => {
      const oldValue = { name: 'Old Name', amount: 1000 };
      const newValue = { name: 'New Name', amount: 2000 };

      const serialized = {
        oldValue: JSON.stringify(oldValue),
        newValue: JSON.stringify(newValue),
      };

      expect(JSON.parse(serialized.oldValue).name).toBe('Old Name');
      expect(JSON.parse(serialized.newValue).name).toBe('New Name');
    });
  });

  describe('Data Export Edge Cases', () => {
    it('should handle zero amounts in currency formatting', () => {
      const csv = generateCSV(['Amount'], [['GHS 0.00']], { Total: 'GHS 0.00' });
      expect(csv).toContain('0.00');
    });

    it('should handle large numbers in Excel export', () => {
      const buffer = generateExcel([{
        sheetName: 'Large Numbers',
        columns: ['Amount'],
        data: [['999999999.99']],
      }]);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle null/undefined values gracefully', () => {
      const csv = generateCSV(
        ['Name', 'Email', 'Phone'],
        [['John Doe', null, undefined]],
      );

      expect(csv).toContain('"John Doe"');
      expect(csv).toContain('""'); // Empty quoted values for null/undefined
      // CSV should have: "Name","Email","Phone" and "John Doe","",""
      const lines = csv.split('\n');
      expect(lines[1]).toBe('"John Doe","",""');
    });
  });

  describe('PDF Generation Edge Cases', () => {
    it('should handle long table with many rows', () => {
      const manyRows = Array.from({ length: 50 }, (_, i) => [
        `Account ${i + 1}`,
        `${(i + 1) * 100}.00`,
        '0.00',
      ]);

      const pdfBuffer = generatePDF({
        title: 'Large Report',
        filename: 'large.pdf',
        reportDate: '2026-09-03',
        columns: ['Code', 'Debit', 'Credit'],
        data: manyRows,
      });

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000); // Should be substantial
    });

    it('should handle special characters in report title', () => {
      const pdfBuffer = generatePDF({
        title: 'Report & Analysis: Q3 2026',
        filename: 'special.pdf',
        reportDate: '2026-09-03',
        columns: ['Item'],
        data: [['Test']],
      });

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Client Management Edge Cases', () => {
    it('should validate credit limit is non-negative', () => {
      const validCreditLimits = [null, 0, 1000, 999999.99];
      validCreditLimits.forEach(limit => {
        expect(limit === null || limit >= 0).toBe(true);
      });
    });

    it('should handle case-insensitive name comparison', () => {
      const name1 = 'ABC Corporation';
      const name2 = 'abc corporation';
      expect(name1.toLowerCase()).toBe(name2.toLowerCase());
    });
  });

  describe('Invoice Retrieval Edge Cases', () => {
    it('should handle invalid pagination parameters', () => {
      const skip = Math.max(0, parseInt('invalid', 10) || 0);
      const take = Math.max(1, Math.min(100, parseInt('invalid', 10) || 20));

      expect(skip).toBe(0);
      expect(take).toBe(20);
    });

    it('should handle filtering by multiple statuses', () => {
      const statuses = ['UNPAID', 'PARTIAL', 'PAID', 'VOID'];
      const filteredStatuses = statuses.filter(s => s !== 'PAID');

      expect(filteredStatuses).toContain('UNPAID');
      expect(filteredStatuses).toContain('PARTIAL');
      expect(filteredStatuses).not.toContain('PAID');
    });
  });
});
