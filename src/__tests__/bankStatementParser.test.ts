import { parseBankStatementCsv } from '../lib/bankStatementParser';

describe('Bank Statement Parser Module', () => {
  it('should parse standard CSV bank statement with Debit and Credit columns', () => {
    const csvContent = `Date,Description,Reference,Debit,Credit,Balance
2026-08-15,Supplier Payment,REF-001,1500.00,0.00,48500.00
2026-08-16,Customer Deposit,PAY-992,0.00,3200.50,51700.50`;

    const { rows, warnings } = parseBankStatementCsv(csvContent);

    expect(warnings).toHaveLength(0);
    expect(rows).toHaveLength(2);

    expect(rows[0].txnDate).toBe('2026-08-15');
    expect(rows[0].description).toBe('Supplier Payment');
    expect(rows[0].debit).toBe(1500.00);
    expect(rows[0].credit).toBe(0.00);

    expect(rows[1].txnDate).toBe('2026-08-16');
    expect(rows[1].credit).toBe(3200.50);
  });

  it('should handle single Amount column with negative/positive values', () => {
    const csvContent = `Date,Description,Amount
15/08/2026,Office Supplies,-250.00
16/08/2026,Service Revenue,1200.00`;

    const { rows } = parseBankStatementCsv(csvContent);

    expect(rows).toHaveLength(2);
    expect(rows[0].debit).toBe(250.00);
    expect(rows[0].credit).toBe(0.00);
    expect(rows[1].credit).toBe(1200.00);
  });
});
