import { getDb } from '@/lib/db';
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
  try {
    const db = await getDb();

    const result = await db.request()
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

    const budgetId = result.recordset[0].Id;

    // Insert budget line items
    for (const lineItem of budget.lineItems) {
      await db.request()
        .input('budgetId', budgetId)
        .input('accountCode', lineItem.accountCode)
        .input('budgetAmount', lineItem.budgetAmount)
        .input('notes', lineItem.notes || null)
        .query(`
          INSERT INTO BudgetLineItems (BudgetId, AccountCode, BudgetAmount, Notes)
          VALUES (@budgetId, @accountCode, @budgetAmount, @notes)
        `);
    }

    logger.info('Budget created', { budgetId, budgetName: budget.budgetName });
    return { budgetId, budgetName: budget.budgetName };
  } catch (err: any) {
    logger.error('Failed to create budget', { error: err.message });
    throw err;
  }
}

/**
 * Calculate budget variance for a specific budget
 */
export async function calculateBudgetVariance(budgetId: number): Promise<BudgetVariance[]> {
  try {
    const db = await getDb();

    const result = await db.request()
      .input('budgetId', budgetId)
      .query(`
        SELECT
          bli.AccountCode,
          coa.AccountName,
          bli.BudgetAmount,
          ISNULL(SUM(jel.Debit - jel.Credit), 0) AS ActualAmount
        FROM BudgetLineItems bli
        INNER JOIN ChartOfAccounts coa ON bli.AccountCode = coa.AccountCode
        LEFT JOIN JournalEntryLines jel ON coa.Id = jel.AccountId
        LEFT JOIN JournalEntries e ON jel.JournalEntryId = e.Id AND e.Status = 'POSTED'
        WHERE bli.BudgetId = @budgetId
        GROUP BY bli.AccountCode, coa.AccountName, bli.BudgetAmount
      `);

    return result.recordset.map((row: any) => {
      const budgeted = Number(row.BudgetAmount);
      const actual = Number(row.ActualAmount);
      const variance = budgeted - actual;
      const variancePercent = budgeted !== 0 ? (variance / budgeted) * 100 : 0;

      // Determine status: For expense accounts (negative actual), unfavorable means higher actual
      // For revenue accounts, unfavorable means lower actual
      let status: 'FAVORABLE' | 'UNFAVORABLE' | 'ON_TRACK';
      if (Math.abs(variancePercent) <= 5) {
        status = 'ON_TRACK';
      } else if (variancePercent > 0) {
        status = 'FAVORABLE'; // Under budget
      } else {
        status = 'UNFAVORABLE'; // Over budget
      }

      return {
        accountCode: row.AccountCode,
        accountName: row.AccountName,
        budgeted,
        actual,
        variance,
        variancePercent,
        status,
      };
    });
  } catch (err: any) {
    logger.error('Failed to calculate budget variance', { error: err.message });
    return [];
  }
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
  } catch (err: any) {
    logger.error('Failed to get budget with variance', { error: err.message });
    return null;
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
  } catch (err: any) {
    logger.error('Failed to list budgets', { error: err.message });
    return [];
  }
}
