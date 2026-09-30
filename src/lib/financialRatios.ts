import { accountBalances, naturalBalance, type AccountBalanceRow } from '@/lib/ledger';
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

const CURRENT_ASSET_CATEGORIES = ['cash', 'bank', 'receivables', 'inventory', 'prepayments'];
const CURRENT_LIABILITY_CATEGORIES = ['payables', 'tax', 'accruals'];
const isCurrent = (category: string | null, list: string[]) => {
  const c = (category || '').toLowerCase();
  return c.includes('current') || list.includes(c);
};

/**
 * Derives ratio inputs from account balances. Balance-sheet figures use
 * cumulative balances; revenue and net income use the year-to-date rows.
 * Current vs non-current is decided by account Category (Cash, Bank,
 * Receivables, Inventory, Prepayments / Payables, Tax, Accruals, or any
 * category containing "Current").
 */
export function metricsFromBalances(cumulative: AccountBalanceRow[], yearToDate: AccountBalanceRow[]): FinancialMetrics {
  const sum = (rows: AccountBalanceRow[], pred: (r: AccountBalanceRow) => boolean) =>
    Math.round(rows.filter(pred).reduce((t, r) => t + naturalBalance(r) * 100, 0)) / 100;

  const revenue = sum(yearToDate, (r) => r.AccountType === 'REVENUE');
  const expenses = sum(yearToDate, (r) => r.AccountType === 'EXPENSE');
  const inventory = sum(cumulative, (r) => r.AccountType === 'ASSET' && (r.Category || '').toLowerCase() === 'inventory');
  const currentAssets = sum(cumulative, (r) => r.AccountType === 'ASSET' && isCurrent(r.Category, CURRENT_ASSET_CATEGORIES));

  return {
    assets: sum(cumulative, (r) => r.AccountType === 'ASSET'),
    liabilities: sum(cumulative, (r) => r.AccountType === 'LIABILITY'),
    equity:
      sum(cumulative, (r) => r.AccountType === 'EQUITY') +
      sum(cumulative, (r) => r.AccountType === 'REVENUE') -
      sum(cumulative, (r) => r.AccountType === 'EXPENSE'),
    revenue,
    netIncome: Math.round((revenue - expenses) * 100) / 100,
    currentAssets,
    quickAssets: Math.round((currentAssets - inventory) * 100) / 100,
    currentLiabilities: sum(cumulative, (r) => r.AccountType === 'LIABILITY' && isCurrent(r.Category, CURRENT_LIABILITY_CATEGORIES)),
    accountsReceivable: sum(cumulative, (r) => r.AccountType === 'ASSET' && (r.Category || '').toLowerCase() === 'receivables'),
    inventory,
  };
}

export async function getFinancialMetrics(asOf: string = new Date().toISOString().slice(0, 10)): Promise<FinancialMetrics> {
  const [cumulative, yearToDate] = await Promise.all([
    accountBalances({ to: asOf }),
    accountBalances({ from: `${asOf.slice(0, 4)}-01-01`, to: asOf }),
  ]);
  return metricsFromBalances(cumulative, yearToDate);
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
