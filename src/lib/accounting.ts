import { getDb, type ConnectionPool, sqlTypes, sql } from '@/lib/db';
import { toCents } from '@/lib/decimalPrecision';

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
  /**
   * Control accounts (AR, AP, inventory) must only move through their
   * sub-ledgers. Manual journals set this to false.
   */
  allowControlAccounts?: boolean;
};

export class ClosedPeriodError extends Error {
  readonly year: number;
  readonly period: number;
  constructor(year: number, period: number) {
    super(`Financial period ${period}/${year} is closed. Cannot post journal entries to a closed period.`);
    this.year = year;
    this.period = period;
    this.name = 'ClosedPeriodError';
  }
}

export class UnbalancedJournalError extends Error {
  constructor(totalDebit: number, totalCredit: number) {
    super(`Journal entry is unbalanced. Total Debits (${totalDebit.toFixed(2)}) != Total Credits (${totalCredit.toFixed(2)}).`);
    this.name = 'UnbalancedJournalError';
  }
}

export class InvalidJournalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidJournalError';
  }
}

export { toCents };

/**
 * Validates journal lines: at least two lines, each line is a finite,
 * non-negative debit OR credit (never both, never neither), amounts have at
 * most 2 decimals once rounded, and total debits equal total credits exactly.
 */
export function validateJournalLines(lines: JournalLine[]): void {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new InvalidJournalError('A journal entry needs at least two lines.');
  }
  let debitCents = 0;
  let creditCents = 0;
  lines.forEach((l, i) => {
    const d = l.debit ?? 0;
    const c = l.credit ?? 0;
    if (!l.accountCode || typeof l.accountCode !== 'string') {
      throw new InvalidJournalError(`Line ${i + 1}: accountCode is required.`);
    }
    if (!Number.isFinite(d) || !Number.isFinite(c) || d < 0 || c < 0) {
      throw new InvalidJournalError(`Line ${i + 1}: debit and credit must be non-negative numbers.`);
    }
    if ((d > 0 && c > 0) || (toCents(d) === 0 && toCents(c) === 0)) {
      throw new InvalidJournalError(`Line ${i + 1}: exactly one of debit or credit must be non-zero.`);
    }
    debitCents += toCents(d);
    creditCents += toCents(c);
  });
  if (debitCents !== creditCents) {
    throw new UnbalancedJournalError(debitCents / 100, creditCents / 100);
  }
}

type RequestSource = sqlTypes.Transaction | ConnectionPool;

function request(src: RequestSource): sqlTypes.Request {
  return new sql.Request(src as sqlTypes.Transaction);
}

/**
 * Throws ClosedPeriodError if the fiscal period (calendar month) containing
 * entryDate is closed. Run inside the posting transaction: HOLDLOCK keeps the
 * period row from being closed until the posting commits.
 */
export async function assertPeriodOpen(src: RequestSource, entryDate: Date): Promise<void> {
  if (Number.isNaN(entryDate.getTime())) {
    throw new InvalidJournalError('Invalid entry date.');
  }
  const year = entryDate.getUTCFullYear();
  const period = entryDate.getUTCMonth() + 1;
  const r = await request(src)
    .input('year', year)
    .input('period', period)
    .query(`
      SELECT TOP 1 IsClosed FROM FinancialPeriods WITH (HOLDLOCK)
      WHERE FiscalYear = @year AND PeriodNumber = @period
    `);
  if (r.recordset[0]?.IsClosed) throw new ClosedPeriodError(year, period);
}

const DOCUMENT_SEQUENCES = {
  invoice: { table: 'Invoices', column: 'InvoiceNumber' },
  payment: { table: 'Payments', column: 'PaymentNumber' },
  creditNote: { table: 'CreditNotes', column: 'CreditNoteNumber' },
  journal: { table: 'JournalEntries', column: 'EntryNumber' },
} as const;

/**
 * Allocates the next document number of the form PREFIX-YYYY-000001.
 *
 * Must run inside the transaction that inserts the document. UPDLOCK+HOLDLOCK
 * takes a key-range lock on the prefix, so concurrent transactions queue here
 * instead of both reading the same MAX and colliding on the unique index.
 */
export async function nextDocumentNumber(
  tx: sqlTypes.Transaction,
  kind: keyof typeof DOCUMENT_SEQUENCES,
  prefix: string,
  date: Date = new Date(),
): Promise<string> {
  if (!/^[A-Z][A-Z-]*$/.test(prefix)) throw new Error(`Invalid document prefix: ${prefix}`);
  const { table, column } = DOCUMENT_SEQUENCES[kind];
  const stem = `${prefix}-${date.getUTCFullYear()}-`;
  const r = await request(tx)
    .input('pattern', `${stem}%`)
    .query(`SELECT MAX(${column}) AS last FROM ${table} WITH (UPDLOCK, HOLDLOCK) WHERE ${column} LIKE @pattern`);
  const last: string | null = r.recordset[0]?.last ?? null;
  const lastSeq = last ? parseInt(last.slice(stem.length), 10) : 0;
  const seq = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${stem}${String(seq).padStart(6, '0')}`;
}

async function getAccountIds(
  tx: sqlTypes.Transaction,
  codes: string[],
  allowControlAccounts = true,
): Promise<Map<string, number>> {
  const unique = [...new Set(codes)];
  const req = request(tx);
  const params = unique.map((code, i) => {
    req.input(`c${i}`, code);
    return `@c${i}`;
  });
  const r = await req.query(
    `SELECT Id, Code, IsControl FROM Accounts WHERE IsActive = 1 AND Code IN (${params.join(', ')})`
  );
  const rows: { Id: number; Code: string; IsControl: boolean }[] = r.recordset;
  const ids = new Map<string, number>(rows.map((row) => [row.Code, row.Id]));
  const missing = unique.filter((c) => !ids.has(c));
  if (!allowControlAccounts) {
    const control = rows.filter((row) => row.IsControl).map((row) => row.Code);
    if (control.length) {
      throw new InvalidJournalError(
        `Control account(s) ${control.join(', ')} can only be posted through their sub-ledger (invoices, payments, stores).`
      );
    }
  }
  if (missing.length) {
    throw new InvalidJournalError(`Account code not found or inactive: ${missing.join(', ')}`);
  }
  return ids;
}

/**
 * Validation that does not need a transaction (kept for callers that want to
 * fail fast before opening one). postJournalInTx repeats these checks.
 */
export async function assertJournalPostable(db: ConnectionPool, opts: PostJournalOptions): Promise<void> {
  validateJournalLines(opts.lines);
  await assertPeriodOpen(db, opts.entryDate);
}

/**
 * Posts a balanced journal entry inside the caller's transaction. Always
 * validates the lines and the fiscal period, so no posting path can bypass them.
 */
export async function postJournalInTx(
  tx: sqlTypes.Transaction,
  _db: ConnectionPool | null,
  opts: PostJournalOptions,
): Promise<{ journalEntryId: number; entryNumber: string }> {
  const { entryDate, description, reference, sourceModule, sourceId, lines, postedBy, reversalOfId } = opts;

  validateJournalLines(lines);
  await assertPeriodOpen(tx, entryDate);
  const accountIds = await getAccountIds(tx, lines.map((l) => l.accountCode), opts.allowControlAccounts ?? true);
  const entryNumber = await nextDocumentNumber(tx, 'journal', 'JNL', entryDate);

  const entryResult = await request(tx)
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
    await request(tx)
      .input('journalEntryId', journalEntryId)
      .input('accountId', accountIds.get(line.accountCode))
      .input('branchId', line.branchId ?? null)
      .input('description', line.description ?? description)
      .input('debit', toCents(line.debit ?? 0) / 100)
      .input('credit', toCents(line.credit ?? 0) / 100)
      .query(`
        INSERT INTO JournalEntryLines
          (JournalEntryId, AccountId, BranchId, Description, Debit, Credit)
        VALUES
          (@journalEntryId, @accountId, @branchId, @description, @debit, @credit)
      `);
  }

  return { journalEntryId, entryNumber };
}

export async function postJournal(opts: PostJournalOptions): Promise<{ journalEntryId: number; entryNumber: string }> {
  validateJournalLines(opts.lines);
  const db = await getDb();

  const tx = new sql.Transaction(db);
  await tx.begin();
  try {
    const res = await postJournalInTx(tx, db, opts);
    await tx.commit();
    return res;
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
}
