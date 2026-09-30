import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface FinancialMetrics {
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  netIncome: number;
  currentAssets: number;
  quickAssets: number;
  currentLiabilities: number;
  accountsReceivable: number;
  inventory?: number;
}

export interface LiquidityRatios {
  currentRatio: number; // Current Assets / Current Liabilities
  quickRatio: number; // (Current Assets - Inventory) / Current Liabilities
  workingCapital: number; // Current Assets - Current Liabilities
}

export interface ProfitabilityRatios {
  netProfitMargin: number; // Net Income / Revenue
  returnOnAssets: number; // Net Income / Total Assets (ROA)
  returnOnEquity: number; // Net Income / Equity (ROE)
  grossProfitMargin?: number; // (Revenue - COGS) / Revenue
}

export interface EfficiencyRatios {
  assetTurnover: number; // Revenue / Total Assets
  receivablesTurnover: number; // Revenue / Accounts Receivable
  daysSalesOutstanding: number; // 365 / Receivables Turnover
}

export interface FinancialRatiosReport {
  reportDate: string;
  liquidity: LiquidityRatios;
  profitability: ProfitabilityRatios;
  efficiency: EfficiencyRatios;
  summary: {
    healthScore: number; // 0-100
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    concerns: string[];
  };
}

/**
 * Calculate liquidity ratios
 */
export function calculateLiquidityRatios(metrics: FinancialMetrics): LiquidityRatios {
  const currentRatio = metrics.currentLiabilities > 0 ? metrics.currentAssets / metrics.currentLiabilities : 0;
  const quickRatio = metrics.currentLiabilities > 0 ? metrics.quickAssets / metrics.currentLiabilities : 0;
  const workingCapital = metrics.currentAssets - metrics.currentLiabilities;

  return {
    currentRatio: Number(currentRatio.toFixed(2)),
    quickRatio: Number(quickRatio.toFixed(2)),
    workingCapital: Number(workingCapital.toFixed(2)),
  };
}

/**
 * Calculate profitability ratios
 */
export function calculateProfitabilityRatios(metrics: FinancialMetrics): ProfitabilityRatios {
  const netProfitMargin = metrics.revenue > 0 ? (metrics.netIncome / metrics.revenue) * 100 : 0;
  const returnOnAssets = metrics.assets > 0 ? (metrics.netIncome / metrics.assets) * 100 : 0;
  const returnOnEquity = metrics.equity > 0 ? (metrics.netIncome / metrics.equity) * 100 : 0;

  return {
    netProfitMargin: Number(netProfitMargin.toFixed(2)),
    returnOnAssets: Number(returnOnAssets.toFixed(2)),
    returnOnEquity: Number(returnOnEquity.toFixed(2)),
  };
}

/**
 * Calculate efficiency ratios
 */
export function calculateEfficiencyRatios(metrics: FinancialMetrics): EfficiencyRatios {
  const assetTurnover = metrics.assets > 0 ? metrics.revenue / metrics.assets : 0;
  const receivablesTurnover = metrics.accountsReceivable > 0 ? metrics.revenue / metrics.accountsReceivable : 0;
  const daysSalesOutstanding = receivablesTurnover > 0 ? 365 / receivablesTurnover : 365;

  return {
    assetTurnover: Number(assetTurnover.toFixed(2)),
    receivablesTurnover: Number(receivablesTurnover.toFixed(2)),
    daysSalesOutstanding: Number(daysSalesOutstanding.toFixed(1)),
  };
}

/**
 * Calculate overall financial health score and status
 */
export function calculateHealthScore(
  liquidity: LiquidityRatios,
  profitability: ProfitabilityRatios,
  efficiency: EfficiencyRatios
): { score: number; status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; concerns: string[] } {
  const concerns: string[] = [];
  let score = 100;

  // Liquidity assessment
  if (liquidity.currentRatio < 1) {
    concerns.push('Current ratio below 1.0 - liquidity risk');
    score -= 25;
  } else if (liquidity.currentRatio < 1.5) {
    concerns.push('Current ratio below 1.5 - monitor liquidity');
    score -= 10;
  }

  if (liquidity.quickRatio < 0.5) {
    concerns.push('Quick ratio below 0.5 - may lack liquid assets');
    score -= 15;
  }

  // Profitability assessment
  if (profitability.netProfitMargin < 0) {
    concerns.push('Operating at a loss');
    score -= 30;
  } else if (profitability.netProfitMargin < 5) {
    concerns.push('Low profit margin - below 5%');
    score -= 15;
  }

  if (profitability.returnOnEquity < 5) {
    concerns.push('ROE below 5% - weak equity returns');
    score -= 10;
  }

  // Efficiency assessment
  if (efficiency.daysSalesOutstanding > 90) {
    concerns.push('High DSO (>90 days) - collection issues');
    score -= 10;
  }

  // Determine status
  let status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  if (score >= 80) {
    status = 'EXCELLENT';
  } else if (score >= 60) {
    status = 'GOOD';
  } else if (score >= 40) {
    status = 'FAIR';
  } else {
    status = 'POOR';
  }

  return { score: Math.max(0, score), status, concerns };
}

/**
 * Get financial metrics from GL data
 */
export async function getFinancialMetrics(): Promise<FinancialMetrics> {
  try {
    const db = await getDb();

    const result = await db.request().query(`
      SELECT
        ISNULL(SUM(CASE WHEN coa.AccountType = 'ASSET' THEN (gl.TotalDebit - gl.TotalCredit) ELSE 0 END), 0) AS Assets,
        ISNULL(SUM(CASE WHEN coa.AccountType = 'LIABILITY' THEN (gl.TotalCredit - gl.TotalDebit) ELSE 0 END), 0) AS Liabilities,
        ISNULL(SUM(CASE WHEN coa.AccountType = 'EQUITY' THEN (gl.TotalCredit - gl.TotalDebit) ELSE 0 END), 0) AS Equity,
        ISNULL(SUM(CASE WHEN coa.AccountType = 'REVENUE' THEN (gl.TotalCredit - gl.TotalDebit) ELSE 0 END), 0) AS Revenue,
        ISNULL(SUM(CASE WHEN coa.AccountType IN ('REVENUE', 'EXPENSE') THEN
          CASE WHEN coa.AccountType = 'REVENUE' THEN (gl.TotalCredit - gl.TotalDebit)
          ELSE (gl.TotalDebit - gl.TotalCredit) END
        ELSE 0 END), 0) AS NetIncome,
        ISNULL(SUM(CASE WHEN coa.Category = 'Current Assets' THEN (gl.TotalDebit - gl.TotalCredit) ELSE 0 END), 0) AS CurrentAssets,
        ISNULL(SUM(CASE WHEN coa.Category = 'Current Assets' AND coa.AccountCode NOT LIKE '%inventory%' THEN (gl.TotalDebit - gl.TotalCredit) ELSE 0 END), 0) AS QuickAssets,
        ISNULL(SUM(CASE WHEN coa.Category = 'Current Liabilities' THEN (gl.TotalCredit - gl.TotalDebit) ELSE 0 END), 0) AS CurrentLiabilities,
        ISNULL(SUM(CASE WHEN coa.AccountCode = '1100' THEN (gl.TotalDebit - gl.TotalCredit) ELSE 0 END), 0) AS AccountsReceivable
      FROM ChartOfAccounts coa
      LEFT JOIN (
        SELECT
          jel.AccountId,
          SUM(jel.Debit) AS TotalDebit,
          SUM(jel.Credit) AS TotalCredit
        FROM JournalEntryLines jel
        INNER JOIN JournalEntries e ON jel.JournalEntryId = e.Id
        WHERE e.Status = 'POSTED'
        GROUP BY jel.AccountId
      ) gl ON coa.Id = gl.AccountId
      GROUP BY coa.AccountType, coa.Category, coa.AccountCode
    `);

    if (result.recordset.length === 0) {
      return {
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
    }

    const row = result.recordset[0];
    return {
      assets: Number(row.Assets) || 0,
      liabilities: Number(row.Liabilities) || 0,
      equity: Number(row.Equity) || 0,
      revenue: Number(row.Revenue) || 0,
      netIncome: Number(row.NetIncome) || 0,
      currentAssets: Number(row.CurrentAssets) || 0,
      quickAssets: Number(row.QuickAssets) || 0,
      currentLiabilities: Number(row.CurrentLiabilities) || 0,
      accountsReceivable: Number(row.AccountsReceivable) || 0,
    };
  } catch (err: any) {
    logger.error('Failed to get financial metrics', { error: err.message });
    return {
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
  }
}

/**
 * Generate comprehensive financial ratios report
 */
export async function generateFinancialRatiosReport(): Promise<FinancialRatiosReport> {
  try {
    const metrics = await getFinancialMetrics();

    const liquidity = calculateLiquidityRatios(metrics);
    const profitability = calculateProfitabilityRatios(metrics);
    const efficiency = calculateEfficiencyRatios(metrics);
    const { score, status, concerns } = calculateHealthScore(liquidity, profitability, efficiency);

    return {
      reportDate: new Date().toISOString().slice(0, 10),
      liquidity,
      profitability,
      efficiency,
      summary: {
        healthScore: score,
        status,
        concerns,
      },
    };
  } catch (err: any) {
    logger.error('Failed to generate financial ratios report', { error: err.message });
    throw err;
  }
}
