import { getDb, sql } from '@/lib/db';
import { ParsedTx } from '@/lib/bankStatementParser';
import { logAudit } from '@/lib/auditLog';

export interface BankTransactionRecord {
  id: number;
  statementId: number;
  bankAccountId: number;
  date: string;
  valueDate: string | null;
  narration: string;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  status: 'CLEARED' | 'UNMATCHED' | 'VARIANCE';
  matchedPaymentRef: string | null;
  matchedAt: string | null;
}

export class ReconciliationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReconciliationError';
  }
}

/**
 * Save bank statement and run auto-matching engine with transaction support
 * Prevents duplicate matches via row-level locking
 */
export async function saveAndMatchBankStatement(
  bankAccountId: number,
  filename: string,
  userId: number,
  rows: ParsedTx[]
) {
  const db = await getDb();
  const tx = new sql.Transaction(db);

  try {
    await tx.begin();

    // 1. Validate bank account exists
    const accountCheck = await new sql.Request(tx)
      .input('accountId', bankAccountId)
      .query(`SELECT Id FROM BankAccounts WHERE Id = @accountId AND IsActive = 1`);

    if (accountCheck.recordset.length === 0) {
      throw new ReconciliationError(`Bank account ${bankAccountId} not found or inactive`);
    }

    // 2. Insert BankStatement Header with transaction
    const stmtResult = await new sql.Request(tx)
      .input('bankAccountId', bankAccountId)
      .input('filename', filename)
      .input('uploadedBy', userId)
      .input('totalLines', rows.length)
      .input('statementDate', new Date())
      .query(`
        INSERT INTO BankStatements (
          BankAccountId, StatementDate, UploadedBy, UploadedAt, TotalLines,
          MatchedLines, UnmatchedLines, Status, Filename,
          StartBalance, EndBalance, TotalDebits, TotalCredits
        )
        OUTPUT INSERTED.Id
        VALUES (
          @bankAccountId, @statementDate, @uploadedBy, GETDATE(), @totalLines,
          0, @totalLines, 'UPLOADED', @filename,
          0, 0, 0, 0
        )
      `);

    const statementId = stmtResult.recordset[0].Id;
    let autoMatchedCount = 0;
    let unmatchedCount = rows.length;
    const processedLines: BankTransactionRecord[] = [];

    // 3. Process each row with auto-matching
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const txnDate = row.txnDate ? new Date(row.txnDate) : new Date();
      const valueDate = row.valueDate ? new Date(row.valueDate) : txnDate;

      // Insert statement line
      const lineInsert = await new sql.Request(tx)
        .input('statementId', statementId)
        .input('sequenceNumber', idx + 1)
        .input('txnDate', txnDate)
        .input('valueDate', valueDate)
        .input('description', row.description || 'N/A')
        .input('reference', row.reference || null)
        .input('debit', row.debit || 0)
        .input('credit', row.credit || 0)
        .input('balance', row.balance || null)
        .query(`
          INSERT INTO BankStatementLines (
            StatementId, BankAccountId, SequenceNumber, TxnDate, ValueDate,
            Description, Reference, Debit, Credit, Balance, Status
          )
          OUTPUT INSERTED.Id
          VALUES (
            @statementId, @bankAccountId, @sequenceNumber, @txnDate, @valueDate,
            @description, @reference, @debit, @credit, @balance, 'UNMATCHED'
          )
        `);

      const lineId = lineInsert.recordset[0].Id;
      const targetAmount = row.credit > 0 ? row.credit : row.debit;
      let isMatched = false;
      let matchedRef = null;
      let matchStrategy = null;

      if (targetAmount > 0) {
        // Strategy 1: Match against Payments (with tolerance of ±1 for rounding)
        const pMatch = await new sql.Request(tx)
          .input('amt', targetAmount)
          .input('ref', row.reference || row.description)
          .input('tolerance', 1.00)
          .input('dateStart', new Date(txnDate.getTime() - 180 * 24 * 60 * 60 * 1000)) // 6-month lookback
          .input('dateEnd', new Date(txnDate.getTime() + 30 * 24 * 60 * 60 * 1000)) // 30-day forward
          .query(`
            SELECT TOP 1 p.Id, p.PaymentNumber, p.Amount, p.PaymentDate
            FROM Payments p WITH (UPDLOCK) -- Row lock to prevent duplicate matches
            WHERE ABS(p.Amount - @amt) <= @tolerance
              AND ISNULL(p.Status, 'POSTED') <> 'REVERSED'
              AND p.PaymentDate BETWEEN @dateStart AND @dateEnd
              AND NOT EXISTS (
                SELECT 1 FROM BankStatementLines bsl2
                WHERE bsl2.MatchedPaymentRef = p.PaymentNumber
                  AND bsl2.Status = 'CLEARED'
              )
            ORDER BY ABS(p.Amount - @amt), p.PaymentDate DESC
          `);

        if (pMatch.recordset.length > 0) {
          isMatched = true;
          matchedRef = pMatch.recordset[0].PaymentNumber;
          matchStrategy = 'AUTO_PAYMENT';
        }
      }

      // Strategy 2: Match against Journal Entries (if not already matched)
      if (!isMatched && targetAmount > 0) {
        const isDebit = row.debit > 0;
        const jMatch = await new sql.Request(tx)
          .input('amt', targetAmount)
          .input('tolerance', 1.00)
          .input('dateStart', new Date(txnDate.getTime() - 180 * 24 * 60 * 60 * 1000))
          .input('dateEnd', new Date(txnDate.getTime() + 30 * 24 * 60 * 60 * 1000))
          .query(`
            SELECT TOP 1 jel.Id, je.Id as JournalId, je.EntryNumber, je.EntryDate,
                   ${isDebit ? 'jel.Debit' : 'jel.Credit'} as Amount
            FROM JournalEntryLines jel WITH (UPDLOCK)
            INNER JOIN JournalEntries je ON jel.JournalEntryId = je.Id
            WHERE je.Status = 'POSTED'
              AND ABS(${isDebit ? 'jel.Debit' : 'jel.Credit'} - @amt) <= @tolerance
              AND je.EntryDate BETWEEN @dateStart AND @dateEnd
              AND NOT EXISTS (
                SELECT 1 FROM BankStatementLines bsl2
                WHERE bsl2.MatchedPaymentRef = je.EntryNumber
                  AND bsl2.Status = 'CLEARED'
              )
            ORDER BY ABS(${isDebit ? 'jel.Debit' : 'jel.Credit'} - @amt), je.EntryDate DESC
          `);

        if (jMatch.recordset.length > 0) {
          isMatched = true;
          matchedRef = jMatch.recordset[0].EntryNumber;
          matchStrategy = 'AUTO_JOURNAL';
        }
      }

      // Apply match if successful
      if (isMatched) {
        autoMatchedCount++;
        unmatchedCount--;

        await new sql.Request(tx)
          .input('lineId', lineId)
          .input('paymentRef', matchedRef)
          .input('userId', userId)
          .query(`
            UPDATE BankStatementLines
            SET Status = 'CLEARED',
                MatchedPaymentRef = @paymentRef,
                MatchedAt = GETDATE(),
                MatchedBy = @userId,
                UpdatedAt = GETDATE()
            WHERE Id = @lineId
          `);

        // Record match audit trail
        await new sql.Request(tx)
          .input('lineId', lineId)
          .input('strategy', matchStrategy)
          .input('reference', matchedRef)
          .input('amount', targetAmount)
          .input('userId', userId)
          .query(`
            INSERT INTO ReconciliationMatches (
              BankStatementLineId, MatchStrategy, MatchedEntityType,
              MatchedEntityId, MatchedReference, MatchedAmount, MatchedBy
            )
            VALUES (
              @lineId, @strategy,
              CASE WHEN @strategy = 'AUTO_PAYMENT' THEN 'PAYMENT' ELSE 'JOURNALENTRY' END,
              0, @reference, @amount, @userId
            )
          `);
      }

      processedLines.push({
        id: lineId,
        statementId,
        bankAccountId,
        date: row.txnDate || new Date().toISOString().split('T')[0],
        valueDate: row.valueDate || null,
        narration: row.description || 'N/A',
        reference: row.reference || null,
        debit: row.debit || 0,
        credit: row.credit || 0,
        balance: row.balance || null,
        status: isMatched ? 'CLEARED' : 'UNMATCHED',
        matchedPaymentRef: matchedRef,
        matchedAt: isMatched ? new Date().toISOString() : null,
      });
    }

    // Update statement summary
    await new sql.Request(tx)
      .input('statementId', statementId)
      .input('matched', autoMatchedCount)
      .input('unmatched', unmatchedCount)
      .query(`
        UPDATE BankStatements
        SET MatchedLines = @matched,
            UnmatchedLines = @unmatched,
            Status = CASE WHEN @unmatched = 0 THEN 'RECONCILED' ELSE 'PARTIAL' END,
            UpdatedAt = GETDATE()
        WHERE Id = @statementId
      `);

    // Commit transaction if all successful
    await tx.commit();

    // Log audit trail for statement upload
    await logAudit({
      entityType: 'BANK_STATEMENT',
      entityId: statementId,
      action: 'CREATE',
      userId,
      newValue: {
        bankAccountId,
        filename,
        totalLines: rows.length,
        matchedLines: autoMatchedCount,
        unmatchedLines: unmatchedCount,
      },
      description: `Bank statement uploaded with ${autoMatchedCount}/${rows.length} auto-matched transactions`,
    });

    return {
      statementId,
      processedLines,
      autoMatchedCount,
      totalLines: rows.length,
    };
  } catch (err) {
    await tx.rollback();
    throw new ReconciliationError(`Bank statement processing failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Manually resolve a variance on a statement line
 */
export async function resolveVariance(
  lineId: number,
  varianceReason: string,
  userId: number
) {
  const db = await getDb();

  const result = await db.request()
    .input('lineId', lineId)
    .input('reason', varianceReason)
    .input('userId', userId)
    .query(`
      UPDATE BankStatementLines
      SET Status = 'VARIANCE',
          MatchedPaymentRef = 'VARIANCE-RESOLVED',
          VarianceReason = @reason,
          MatchedBy = @userId,
          MatchedAt = GETDATE(),
          UpdatedAt = GETDATE()
      WHERE Id = @lineId
    `);

  if (result.rowsAffected[0] === 0) {
    throw new ReconciliationError(`Bank statement line ${lineId} not found`);
  }

  await logAudit({
    entityType: 'BANK_STATEMENT_LINE',
    entityId: lineId,
    action: 'UPDATE',
    userId,
    newValue: { status: 'VARIANCE', varianceReason },
    description: `Variance resolved on statement line: ${varianceReason}`,
  });

  return result;
}

/**
 * Get transactions for a bank account with pagination
 */
export async function getBankTransactions(
  bankAccountId: number,
  skip: number = 0,
  take: number = 10,
  status?: string
) {
  const db = await getDb();

  const query = `
    SELECT
      bsl.Id,
      bsl.StatementId as BankStatementId,
      bsl.TxnDate as TransactionDate,
      bsl.ValueDate,
      bsl.Description,
      bsl.Reference,
      bsl.Debit,
      bsl.Credit,
      bsl.Balance,
      bsl.Status,
      bsl.MatchedPaymentRef,
      bsl.MatchedAt,
      u.Name as MatchedByName,
      bs.Filename
    FROM BankStatementLines bsl
    LEFT JOIN BankStatements bs ON bsl.StatementId = bs.Id
    LEFT JOIN Users u ON bsl.MatchedBy = u.Id
    WHERE (bs.BankAccountId = @bankAccountId OR bsl.BankAccountId = @bankAccountId)
      ${status ? 'AND bsl.Status = @status' : ''}
    ORDER BY bsl.TxnDate DESC
    OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM BankStatementLines bsl
    LEFT JOIN BankStatements bs ON bsl.StatementId = bs.Id
    WHERE (bs.BankAccountId = @bankAccountId OR bsl.BankAccountId = @bankAccountId)
      ${status ? 'AND bsl.Status = @status' : ''}
  `;

  const req = db.request()
    .input('bankAccountId', sql.Int, bankAccountId)
    .input('skip', sql.Int, skip)
    .input('take', sql.Int, Math.min(take, 1000));

  if (status) {
    req.input('status', sql.NVarChar, status);
  }

  const countReq = db.request()
    .input('bankAccountId', sql.Int, bankAccountId);

  if (status) {
    countReq.input('status', sql.NVarChar, status);
  }

  const [txns, countResult] = await Promise.all([
    req.query(query),
    countReq.query(countQuery),
  ]);

  return {
    transactions: txns.recordset,
    total: countResult.recordset[0]?.total || 0,
    skip,
    take: Math.min(take, 1000),
  };
}
