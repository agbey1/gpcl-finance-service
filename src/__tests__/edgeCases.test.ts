import { computeLevies } from '../lib/ghanaLevies';
import { roundMonetary, sumMonetary } from '../lib/decimalPrecision';

describe('Financial Edge Cases & Multi-Line Precision Validation', () => {
  describe('Multi-Line Rounding Discrepancies (3 x 33.33 GHS)', () => {
    it('should maintain strict precision and sum of line items matching total amount', () => {
      const line1 = roundMonetary(33.333333);
      const line2 = roundMonetary(33.333333);
      const line3 = roundMonetary(33.333333);

      expect(line1).toBe(33.33);
      expect(line2).toBe(33.33);
      expect(line3).toBe(33.33);

      const total = sumMonetary([line1, line2, line3]);
      expect(total).toBe(99.99);
    });

    it('should compute exact levies for precision limit values (0.01 GHS minimum)', () => {
      const levies = computeLevies(0.01);
      expect(levies.net).toBe(0.01);
      expect(levies.gross).toBeGreaterThanOrEqual(0.01);
    });

    it('should calculate levies accurately for large financial amounts (10,000,000.00 GHS)', () => {
      const levies = computeLevies(10000000.00);
      expect(levies.net).toBe(10000000.00);
      expect(levies.vat).toBe(1500000.00); // 15%
      expect(levies.nhis).toBe(250000.00);  // 2.5%
      expect(levies.getfund).toBe(250000.00); // 2.5%
      expect(levies.gross).toBe(12000000.00); // 12M Gross
    });
  });
});
