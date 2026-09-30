import { getDb, sql } from '@/lib/db';
import { logger } from '@/lib/logger';

export type BudgetStatus = 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'CLOSED';
export type BudgetPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface BudgetLineItem {
  accountCode: string;
  budgetAmount: number;
  notes?: string;
}

export interface BudgetData {
  budgetName: string;
  description?: string;
  period: BudgetPeriod;
  fiscalYear: number;
  startPeriod?: number; // 1-12 for monthly start
  lineItems: BudgetLineItem[];
  createdBy: number;
}

export interface BudgetVariance {
  accountCode: string;
  accountName: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'FAVORABLE' | 'UNFAVORABLE' | 'ON_TRACK'; // Depending on account type
}

/**
 * Create a new budget
 */
export async function createBudget(budget: BudgetData): Promise<{ budgetId: number; budgetName: string }> {
  const db = await getDb();
  const tx = new sql.Transaction(db);
  await tx.begin();
  try {
    const result = await new sql.Request(tx)
      .input('budgetName', budget.budgetName)
      .input('description', budget.description || null)
      .input('period', budget.period)
      .input('fiscalYear', budget.fiscalYear)
      .input('startPeriod', budget.startPeriod || 1)
      .input('createdBy', budget.createdBy)
      .query(`
        INSERT INTO Budgets (BudgetName, Description, Period, FiscalYear, StartPeriod, Status, CreatedBy, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.Id
        VALUES (@budgetName, @description, @period, @fiscalYear, @startPeriod, 'DRAFT', @createdBy, GETDATE(), GETDATE())
      `);
    const budgetId: number = result.recordset[0].Id;

    for (const lineItem of budget.lineItems) {
      await new sql.Request(tx)
        .input('budgetId', budgetId)
        .input('accountCode', lineItem.accountCode)
        .input('budgetAmount', lineItem.budgetAmount)
        .input('notes', lineItem.notes || null)
        .query(`
          INSERT INTO BudgetLineItems (BudgetId, AccountCode, BudgetAmount, Notes)
          VALUES (@budgetId, @accountCode, @budgetAmount, @notes)
        `);
    }

    await tx.commit();
    logger.info('Budget created', { budgetId, budgetName: budget.budgetName });
    return { budgetId, budgetName: budget.budgetName };
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
}

/**
 * Calculate budget variance for a specific budget
 */
export async function calculateBudgetVariance(budgetId: number): Promise<BudgetVariance[]> {
  const db = await getDb();

  // Actuals are posted activity in the budget's fiscal year, in each account's
  // natural direction (debit for assets/expenses, credit for revenue/liabilities/equity).
  const result = await db.request()
    .input('budgetId', budgetId)
    .query(`
      SELECT
        bli.AccountCode,
        coa.AccountName,
        coa.AccountType,
        SUM(bli.BudgetAmount) AS BudgetAmount,
        ISNULL(MAX(act.Net), 0) AS NetDebit
      FROM BudgetLineItems bli
      INNER JOIN Budgets b ON b.Id = bli.BudgetId
      INNER JOIN ChartOfAccounts coa ON bli.AccountCode = coa.AccountCode
      OUTER APPLY (
        SELECT SUM(jel.Debit - jel.Credit) AS Net
        FROM JournalEntryLines jel
        INNER JOIN JournalEntries e ON e.Id = jel.JournalEntryId
        WHERE jel.AccountId = coa.Id
          AND e.Status = 'POSTED'
          AND e.EntryDate >= DATEFROMPARTS(b.FiscalYear, 1, 1)
          AND e.EntryDate < DATEFROMPARTS(b.FiscalYear + 1, 1, 1)
      ) act
      WHERE bli.BudgetId = @budgetId
      GROUP BY bli.AccountCode, coa.AccountName, coa.AccountType
      ORDER BY bli.AccountCode
    `);

  return result.recordset.map((row: { AccountCode: string; AccountName: string; AccountType: string; BudgetAmount: number; NetDebit: number }) =>
    budgetVarianceRow(row.AccountCode, row.AccountName, row.AccountType, Number(row.BudgetAmount), Number(row.NetDebit))
  );
}

/** Classifies one budget line. Pure, so it is unit-tested directly. */
export function budgetVarianceRow(
  accountCode: string,
  accountName: string,
  accountType: string,
  budgeted: number,
  netDebit: number,
): BudgetVariance {
  const creditNatured = ['REVENUE', 'LIABILITY', 'EQUITY'].includes((accountType || '').toUpperCase());
  const actual = Math.round((creditNatured ? -netDebit : netDebit) * 100) / 100;
  const variance = Math.round((budgeted - actual) * 100) / 100;
  const variancePercent = budgeted !== 0 ? (variance / budgeted) * 100 : 0;

  let status: BudgetVariance['status'];
  if (Math.abs(variancePercent) <= 5) status = 'ON_TRACK';
  else if (creditNatured) status = actual > budgeted ? 'FAVORABLE' : 'UNFAVORABLE'; // more revenue is good
  else status = actual < budgeted ? 'FAVORABLE' : 'UNFAVORABLE'; // less spend is good

  return { accountCode, accountName, budgeted, actual, variance, variancePercent, status };
}

/**
 * Get budget by ID with variance data
 */
export async function getBudgetWithVariance(budgetId: number): Promise<any> {
  try {
    const db = await getDb();

    const result = await db.request()
      .input('budgetId', budgetId)
      .query(`
        SELECT
          Id,
          BudgetName,
          Description,
          Period,
          FiscalYear,
          StartPeriod,
          Status,
          CreatedBy,
          CreatedAt,
          UpdatedAt
        FROM Budgets
        WHERE Id = @budgetId
      `);

    if (!result.recordset.length) {
      return null;
    }

    const budget = result.recordset[0];
    const variance = await calculateBudgetVariance(budgetId);

    return {
      ...budget,
      variance,
      totalBudget: variance.reduce((sum, v) => sum + v.budgeted, 0),
      totalActual: variance.reduce((sum, v) => sum + v.actual, 0),
    };
  } catch (err) {
    logger.error('Failed to get budget with variance', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/**
 * Update budget status
 */
export async function updateBudgetStatus(budgetId: number, status: BudgetStatus): Promise<boolean> {
  try {
    const db = await getDb();

    await db.request()
      .input('budgetId', budgetId)
      .input('status', status)
      .query(`
        UPDATE Budgets
        SET Status = @status, UpdatedAt = GETDATE()
        WHERE Id = @budgetId
      `);

    logger.info('Budget status updated', { budgetId, status });
    return true;
  } catch (err: any) {
    logger.error('Failed to update budget status', { error: err.message });
    return false;
  }
}

/**
 * List all budgets for a fiscal year
 */
export async function listBudgets(fiscalYear: number, limit: number = 50): Promise<any[]> {
  try {
    const db = await getDb();

    const result = await db.request()
      .input('fiscalYear', fiscalYear)
      .input('limit', limit)
      .query(`
        SELECT TOP (@limit)
          Id,
          BudgetName,
          Description,
          Period,
          FiscalYear,
          Status,
          CreatedBy,
          CreatedAt
        FROM Budgets
        WHERE FiscalYear = @fiscalYear
        ORDER BY CreatedAt DESC
      `);

    return result.recordset;
  } catch (err) {
    logger.error('Failed to list budgets', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
