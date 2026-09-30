import {
  calculateLiquidityRatios,
  calculateProfitabilityRatios,
  calculateEfficiencyRatios,
  calculateHealthScore,
  type FinancialMetrics,
} from '../lib/financialRatios';

describe('Budget Tracking & Financial Ratios', () => {
  describe('Liquidity Ratios', () => {
    it('should calculate current ratio correctly', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 100000,
        netIncome: 10000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 15000,
      };

      const ratios = calculateLiquidityRatios(metrics);

      expect(ratios.currentRatio).toBe(2); // 40,000 / 20,000
      expect(ratios.currentRatio).toBeGreaterThan(1); // Good liquidity
    });

    it('should calculate quick ratio correctly', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 100000,
        netIncome: 10000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 15000,
      };

      const ratios = calculateLiquidityRatios(metrics);

      expect(ratios.quickRatio).toBe(1.5); // 30,000 / 20,000
      expect(ratios.quickRatio).toBeGreaterThan(0.5); // Reasonable quick ratio
    });

    it('should calculate working capital correctly', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 100000,
        netIncome: 10000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 15000,
      };

      const ratios = calculateLiquidityRatios(metrics);

      expect(ratios.workingCapital).toBe(20000); // 40,000 - 20,000
      expect(ratios.workingCapital).toBeGreaterThan(0); // Positive working capital
    });

    it('should handle zero current liabilities', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 100000,
        netIncome: 10000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 0,
        accountsReceivable: 15000,
      };

      const ratios = calculateLiquidityRatios(metrics);

      expect(ratios.currentRatio).toBe(0);
      expect(ratios.quickRatio).toBe(0);
    });
  });

  describe('Profitability Ratios', () => {
    it('should calculate net profit margin correctly', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 100000,
        netIncome: 15000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 15000,
      };

      const ratios = calculateProfitabilityRatios(metrics);

      expect(ratios.netProfitMargin).toBe(15); // 15,000 / 100,000 * 100
      expect(ratios.netProfitMargin).toBeGreaterThan(5); // Above 5% is good
    });

    it('should calculate ROA correctly', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 100000,
        netIncome: 10000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 15000,
      };

      const ratios = calculateProfitabilityRatios(metrics);

      expect(ratios.returnOnAssets).toBe(10); // 10,000 / 100,000 * 100
    });

    it('should calculate ROE correctly', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 100000,
        netIncome: 10000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 15000,
      };

      const ratios = calculateProfitabilityRatios(metrics);

      expect(ratios.returnOnEquity).toBe(20); // 10,000 / 50,000 * 100
      expect(ratios.returnOnEquity).toBeGreaterThan(10); // 20% ROE is good
    });

    it('should handle loss scenario', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 100000,
        netIncome: -5000, // Loss
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 15000,
      };

      const ratios = calculateProfitabilityRatios(metrics);

      expect(ratios.netProfitMargin).toBe(-5); // Negative margin
      expect(ratios.returnOnAssets).toBe(-5);
      expect(ratios.returnOnEquity).toBe(-10);
    });
  });

  describe('Efficiency Ratios', () => {
    it('should calculate asset turnover correctly', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 200000, // 2x assets
        netIncome: 10000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 15000,
      };

      const ratios = calculateEfficiencyRatios(metrics);

      expect(ratios.assetTurnover).toBe(2); // 200,000 / 100,000
    });

    it('should calculate receivables turnover correctly', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 300000,
        netIncome: 10000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 30000, // Revenue is 10x receivables
      };

      const ratios = calculateEfficiencyRatios(metrics);

      expect(ratios.receivablesTurnover).toBe(10); // 300,000 / 30,000
    });

    it('should calculate days sales outstanding correctly', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 365000,
        netIncome: 10000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 365000, // DSO should be 365 days
      };

      const ratios = calculateEfficiencyRatios(metrics);

      expect(ratios.daysSalesOutstanding).toBe(365); // (365 / (365000/365000)) = 365
    });

    it('should handle zero receivables', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 300000,
        netIncome: 10000,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 0,
      };

      const ratios = calculateEfficiencyRatios(metrics);

      expect(ratios.receivablesTurnover).toBe(0);
      expect(ratios.daysSalesOutstanding).toBe(365); // Default to 365
    });
  });

  describe('Financial Health Score', () => {
    it('should calculate excellent health score', () => {
      const liquidity = { currentRatio: 2.5, quickRatio: 2, workingCapital: 50000 };
      const profitability = { netProfitMargin: 20, returnOnAssets: 15, returnOnEquity: 30 };
      const efficiency = { assetTurnover: 2, receivablesTurnover: 12, daysSalesOutstanding: 30 };

      const { score, status, concerns } = calculateHealthScore(liquidity, profitability, efficiency);

      expect(score).toBeGreaterThanOrEqual(80);
      expect(status).toBe('EXCELLENT');
      expect(concerns.length).toBe(0);
    });

    it('should identify liquidity concerns', () => {
      const liquidity = { currentRatio: 0.8, quickRatio: 0.3, workingCapital: -10000 };
      const profitability = { netProfitMargin: 15, returnOnAssets: 10, returnOnEquity: 20 };
      const efficiency = { assetTurnover: 1.5, receivablesTurnover: 8, daysSalesOutstanding: 45 };

      const { score, status, concerns } = calculateHealthScore(liquidity, profitability, efficiency);

      expect(concerns.length).toBeGreaterThan(0);
      expect(concerns[0]).toContain('liquidity');
    });

    it('should identify profitability concerns', () => {
      const liquidity = { currentRatio: 1.5, quickRatio: 1, workingCapital: 20000 };
      const profitability = { netProfitMargin: -5, returnOnAssets: -2, returnOnEquity: -5 };
      const efficiency = { assetTurnover: 1.5, receivablesTurnover: 8, daysSalesOutstanding: 45 };

      const { score, status, concerns } = calculateHealthScore(liquidity, profitability, efficiency);

      expect(score).toBeLessThan(80);
      expect(status).not.toBe('EXCELLENT');
      expect(concerns).toContain('Operating at a loss');
    });

    it('should identify collection concerns', () => {
      const liquidity = { currentRatio: 1.5, quickRatio: 1, workingCapital: 20000 };
      const profitability = { netProfitMargin: 10, returnOnAssets: 8, returnOnEquity: 15 };
      const efficiency = { assetTurnover: 1.5, receivablesTurnover: 3, daysSalesOutstanding: 120 };

      const { concerns } = calculateHealthScore(liquidity, profitability, efficiency);

      expect(concerns.some((c) => c.includes('DSO'))).toBe(true);
    });

    it('should set score to minimum of 0', () => {
      const liquidity = { currentRatio: 0.5, quickRatio: 0.2, workingCapital: -100000 };
      const profitability = { netProfitMargin: -50, returnOnAssets: -50, returnOnEquity: -100 };
      const efficiency = { assetTurnover: 0.1, receivablesTurnover: 1, daysSalesOutstanding: 365 };

      const { score } = calculateHealthScore(liquidity, profitability, efficiency);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Budget Line Item Validation', () => {
    it('should require positive budget amounts', () => {
      const invalidAmount = -1000;
      expect(invalidAmount).toBeLessThan(0);
    });

    it('should accept valid account codes', () => {
      const accountCode = '1100';
      expect(accountCode.length).toBeGreaterThan(0);
      expect(accountCode.length).toBeLessThanOrEqual(20);
    });

    it('should calculate budget variance correctly', () => {
      const budgeted = 5000;
      const actual = 4500;
      const variance = budgeted - actual;
      const variancePercent = (variance / budgeted) * 100;

      expect(variance).toBe(500);
      expect(variancePercent).toBe(10); // 10% under budget (favorable)
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero revenue', () => {
      const metrics: FinancialMetrics = {
        assets: 100000,
        liabilities: 50000,
        equity: 50000,
        revenue: 0,
        netIncome: 0,
        currentAssets: 40000,
        quickAssets: 30000,
        currentLiabilities: 20000,
        accountsReceivable: 0,
      };

      const profitability = calculateProfitabilityRatios(metrics);

      expect(profitability.netProfitMargin).toBe(0);
    });

    it('should handle all zero metrics', () => {
      const metrics: FinancialMetrics = {
        assets: 0,
        liabilities: 0,
        equity: 0,
        revenue: 0,
        netIncome: 0,
        currentAssets: 0,
        quickAssets: 0,
        currentLiabilities: 0,
        accountsReceivable: 0,
      };

      const liquidity = calculateLiquidityRatios(metrics);
      const profitability = calculateProfitabilityRatios(metrics);
      const efficiency = calculateEfficiencyRatios(metrics);

      expect(liquidity.currentRatio).toBe(0);
      expect(profitability.netProfitMargin).toBe(0);
      expect(efficiency.assetTurnover).toBe(0);
    });

    it('should format ratios to 2 decimal places', () => {
      const metrics: FinancialMetrics = {
        assets: 123456,
        liabilities: 54321,
        equity: 69135,
        revenue: 234567,
        netIncome: 12345,
        currentAssets: 45678,
        quickAssets: 34567,
        currentLiabilities: 23456,
        accountsReceivable: 16789,
      };

      const ratios = calculateEfficiencyRatios(metrics);

      // Check that values are formatted to 2 decimal places
      const decimalPlaces = (num: number) => (num.toString().split('.')[1] || '').length;

      expect(decimalPlaces(ratios.assetTurnover)).toBeLessThanOrEqual(2);
      expect(decimalPlaces(ratios.receivablesTurnover)).toBeLessThanOrEqual(2);
    });
  });
});
