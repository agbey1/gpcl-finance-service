import { getDb, type ConnectionPool, sqlTypes, sql } from '@/lib/db';
import { validateGLBalance, sumMonetary, GL_BALANCE_TOLERANCE } from '@/lib/decimalPrecision';

export type JournalLine = {
  accountCode: string;
  description?: string;
  debit?: number;
  credit?: number;
  branchId?: number | null;
};

export type PostJournalOptions = {
  entryDate: Date;
  description: string;
  reference?: string;
  sourceModule: string;
  sourceId: string | number;
  lines: JournalLine[];
  postedBy: number;
  reversalOfId?: number | null;
};

export class ClosedPeriodError extends Error {
  readonly year: number;
  constructor(year: number) {
    super(`Financial year ${year} is closed. Cannot post journal entries to a closed period.`);
    this.year = year;
    this.name = 'ClosedPeriodError';
  }
}

export class UnbalancedJournalError extends Error {
  constructor(totalDebit: number, totalCredit: number) {
    super(`Journal entry is unbalanced. Total Debits (${totalDebit.toFixed(4)}) != Total Credits (${totalCredit.toFixed(4)}).`);
    this.name = 'UnbalancedJournalError';
  }
}

async function assertPeriodOpen(db: ConnectionPool, entryDate: Date): Promise<void> {
  const year = entryDate.getFullYear();
  const r = await db.request()
    .input('year', year)
    .query('SELECT Status FROM FinancialPeriods WHERE FinancialYear = @year');
  if (r.recordset[0]?.Status === 'CLOSED') throw new ClosedPeriodError(year);
}

async function nextEntryNumber(tx: sqlTypes.Transaction): Promise<string> {
  const r = await new (sql as any).Request(tx)
    .query("SELECT COUNT(*) AS cnt FROM JournalEntries");
  const seq = String((r.recordset[0]?.cnt || 0) + 1).padStart(6, '0');
  const year = new Date().getFullYear();
  return `JNL-${year}-${seq}`;
}

async function getAccountInfo(db: ConnectionPool, code: string): Promise<{ Id: number; IsControl: boolean }> {
  const r = await db.request().input('code', code).query(
    'SELECT Id, IsControl FROM Accounts WHERE Code = @code AND IsActive = 1'
  );
  if (!r.recordset.length) throw new Error(`Account code not found or inactive: ${code}`);
  return { Id: r.recordset[0].Id, IsControl: !!r.recordset[0].IsControl };
}

export async function assertJournalPostable(db: ConnectionPool, opts: PostJournalOptions): Promise<void> {
  await assertPeriodOpen(db, opts.entryDate);
  const totalDebit = sumMonetary(opts.lines.map(l => l.debit || 0), 4);
  const totalCredit = sumMonetary(opts.lines.map(l => l.credit || 0), 4);
  if (!validateGLBalance(totalDebit, totalCredit)) {
    throw new UnbalancedJournalError(totalDebit, totalCredit);
  }
}

export async function postJournalInTx(
  tx: sqlTypes.Transaction,
  db: ConnectionPool,
  opts: PostJournalOptions,
): Promise<{ journalEntryId: number; entryNumber: string }> {
  const { entryDate, description, reference, sourceModule, sourceId, lines, postedBy, reversalOfId } = opts;
  const entryNumber = await nextEntryNumber(tx);

  const entryResult = await new (sql as any).Request(tx)
    .input('entryNumber', entryNumber)
    .input('entryDate', entryDate)
    .input('description', description)
    .input('reference', reference ?? null)
    .input('sourceModule', sourceModule)
    .input('sourceId', String(sourceId))
    .input('postedBy', postedBy)
    .input('reversalOfId', reversalOfId ?? null)
    .query(`
      INSERT INTO JournalEntries
        (EntryNumber, EntryDate, Description, Reference, SourceModule, SourceId, Status, ReversalOfId, PostedBy)
      OUTPUT INSERTED.Id
      VALUES
        (@entryNumber, @entryDate, @description, @reference, @sourceModule, @sourceId, 'POSTED', @reversalOfId, @postedBy)
    `);

  const journalEntryId: number = entryResult.recordset[0].Id;

  for (const line of lines) {
    const accountInfo = await getAccountInfo(db, line.accountCode);
    const lineReq = new (sql as any).Request(tx);
    lineReq.input('journalEntryId', journalEntryId);
    lineReq.input('accountId', accountInfo.Id);
    lineReq.input('branchId', line.branchId ?? null);
    lineReq.input('description', line.description ?? description);
    lineReq.input('debit', line.debit || 0);
    lineReq.input('credit', line.credit || 0);

    await lineReq.query(`
      INSERT INTO JournalEntryLines
        (JournalEntryId, AccountId, BranchId, Description, Debit, Credit)
      VALUES
        (@journalEntryId, @accountId, @branchId, @description, @debit, @credit)
    `);
  }

  return { journalEntryId, entryNumber };
}

export async function postJournal(opts: PostJournalOptions): Promise<{ journalEntryId: number; entryNumber: string }> {
  const db = await getDb();
  await assertJournalPostable(db, opts);

  const tx = new sql.Transaction(db);
  await tx.begin();
  try {
    const res = await postJournalInTx(tx, db, opts);
    await tx.commit();
    return res;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
