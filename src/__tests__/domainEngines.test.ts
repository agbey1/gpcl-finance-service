import { computeLevies, VAT_RATE, NHIS_RATE, GETFUND_RATE } from '../lib/ghanaLevies';
import { computePAYE, reverseGrossFromPAYE, type PAYEBand } from '../lib/taxRates';
import { roundMonetary, sumMonetary, validateGLBalance } from '../lib/decimalPrecision';

describe('Core Financial & Ghana Tax Calculation Engines', () => {
  describe('Ghana Statutory Levies Engine', () => {
    it('should compute exact 15% VAT, 2.5% NHIL, and 2.5% GETFund breakdown', () => {
      const result = computeLevies(1000.00);

      expect(result.net).toBe(1000.00);
      expect(result.vat).toBe(150.00); // 15%
      expect(result.nhis).toBe(25.00);  // 2.5%
      expect(result.getfund).toBe(25.00); // 2.5%
      expect(result.gross).toBe(1200.00); // 20% total levies
    });

    it('should handle decimal rounding for non-integer transactions correctly', () => {
      const result = computeLevies(157.35);

      expect(result.net).toBe(157.35);
      expect(result.vat).toBe(23.60);
      expect(result.nhis).toBe(3.93);
      expect(result.getfund).toBe(3.93);
      expect(result.gross).toBe(188.81);
    });
  });

  describe('Monetary Currency Precision & GL Balance Validation', () => {
    it('should round Ghana Cedi amounts to 2 decimal places cleanly', () => {
      expect(roundMonetary(100.5432)).toBe(100.54);
      expect(roundMonetary(100.5467)).toBe(100.55);
    });

    it('should sum monetary numbers without floating point drift', () => {
      expect(sumMonetary([0.1, 0.2, 0.3])).toBe(0.60);
    });

    it('should validate General Ledger debit and credit equality', () => {
      expect(validateGLBalance(15000.00, 15000.00)).toBe(true);
      expect(validateGLBalance(15000.00, 14999.00)).toBe(false);
    });
  });

  describe('Ghana GRA PAYE Progressive Income Tax Engine', () => {
    const mockPAYEBands: PAYEBand[] = [
      { BandOrder: 1, LowerInclusive: 0, UpperExclusive: 490, Rate: 0 },
      { BandOrder: 2, LowerInclusive: 490, UpperExclusive: 600, Rate: 0.05 },
      { BandOrder: 3, LowerInclusive: 600, UpperExclusive: 730, Rate: 0.10 },
      { BandOrder: 4, LowerInclusive: 730, UpperExclusive: 3896.67, Rate: 0.175 },
      { BandOrder: 5, LowerInclusive: 3896.67, UpperExclusive: 19896.67, Rate: 0.25 },
      { BandOrder: 6, LowerInclusive: 19896.67, UpperExclusive: null, Rate: 0.30 },
    ];

    it('should compute zero PAYE tax for income within tax-free threshold (GHS 490)', () => {
      const tax = computePAYE(450, mockPAYEBands);
      expect(tax).toBe(0);
    });

    it('should compute progressive PAYE tax across multiple income brackets', () => {
      const tax = computePAYE(5000, mockPAYEBands);
      expect(tax).toBeGreaterThan(0);
      expect(typeof tax).toBe('number');
    });

    it('should reverse gross income from calculated PAYE tax amount', () => {
      const paye = computePAYE(5000, mockPAYEBands);
      const gross = reverseGrossFromPAYE(paye, mockPAYEBands);
      expect(Math.abs(gross - 5000)).toBeLessThan(5);
    });
  });
});
