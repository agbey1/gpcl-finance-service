import { getDb, sql, type ConnectionPool } from '@/lib/db';

/**
 * GL accounts used by system postings (invoices, payments, voids, credit notes)
 * and by the levy return / dashboard. Stored in SystemSettings as `gl.<role>`;
 * the codes below apply until a role is remapped.
 */
export const GL_ROLES = {
  cash: { label: 'Cash on hand (cash receipts)', type: 'ASSET', default: '1001', lockOnceUsed: false },
  bank: { label: 'Bank (bank and transfer receipts)', type: 'ASSET', default: '1002', lockOnceUsed: false },
  receivables: { label: 'Trade receivables (AR control)', type: 'ASSET', default: '1100', lockOnceUsed: true },
  revenue: { label: 'Sales revenue', type: 'REVENUE', default: '4001', lockOnceUsed: true },
  vat: { label: 'VAT payable', type: 'LIABILITY', default: '2100', lockOnceUsed: true },
  nhil: { label: 'NHIL payable', type: 'LIABILITY', default: '2102', lockOnceUsed: true },
  getfund: { label: 'GETFund payable', type: 'LIABILITY', default: '2103', lockOnceUsed: true },
} as const;

export type GlRole = keyof typeof GL_ROLES;
export type AccountMap = Record<GlRole, string>;
export const GL_ROLE_KEYS = Object.keys(GL_ROLES) as GlRole[];

const settingKey = (role: GlRole) => `gl.${role}`;

export const DEFAULT_ACCOUNT_MAP: AccountMap = Object.fromEntries(
  GL_ROLE_KEYS.map((r) => [r, GL_ROLES[r].default]),
) as AccountMap;

type Queryable = Pick<ConnectionPool, 'request'>;

export async function getAccountMap(src?: Queryable): Promise<AccountMap> {
  const db: Queryable = src ?? (await getDb());
  const r = await db.request().query(`SELECT SettingKey, SettingValue FROM SystemSettings WHERE SettingKey LIKE 'gl.%'`);
  const map: AccountMap = { ...DEFAULT_ACCOUNT_MAP };
  for (const row of r.recordset as { SettingKey: string; SettingValue: string }[]) {
    const role = row.SettingKey.slice(3) as GlRole;
    if (role in GL_ROLES && row.SettingValue) map[role] = row.SettingValue;
  }
  return map;
}

export type AccountInfo = { Code: string; AccountType: string; IsActive: boolean; HasPostings: boolean };

/**
 * Checks a proposed mapping against the chart of accounts. Returns
 * human-readable problems; empty means valid.
 */
export function validateAccountMap(
  current: AccountMap,
  proposed: AccountMap,
  accounts: Map<string, AccountInfo>,
): string[] {
  const errors: string[] = [];
  for (const role of GL_ROLE_KEYS) {
    const def = GL_ROLES[role];
    const code = proposed[role];
    const acct = accounts.get(code);
    if (!code) {
      errors.push(`${def.label}: an account is required.`);
    } else if (!acct) {
      errors.push(`${def.label}: account ${code} does not exist.`);
    } else if (!acct.IsActive) {
      errors.push(`${def.label}: account ${code} is inactive.`);
    } else if (acct.AccountType !== def.type) {
      errors.push(`${def.label}: account ${code} is ${acct.AccountType}, expected ${def.type}.`);
    }
    if (def.lockOnceUsed && code !== current[role] && accounts.get(current[role])?.HasPostings) {
      errors.push(
        `${def.label}: cannot change from ${current[role]} because it already has postings ` +
          `(voids and credit notes reverse through it).`,
      );
    }
  }
  const seen = new Map<string, GlRole>();
  for (const role of GL_ROLE_KEYS) {
    const other = seen.get(proposed[role]);
    if (other) errors.push(`${GL_ROLES[role].label} and ${GL_ROLES[other].label} cannot use the same account (${proposed[role]}).`);
    else seen.set(proposed[role], role);
  }
  return errors;
}

export async function loadAccountInfo(db: Queryable, codes: string[]): Promise<Map<string, AccountInfo>> {
  const unique = [...new Set(codes.filter(Boolean))];
  if (!unique.length) return new Map();
  const req = db.request();
  const params = unique.map((c, i) => {
    req.input(`c${i}`, sql.NVarChar, c);
    return `@c${i}`;
  });
  const r = await req.query(`
    SELECT a.Code, a.AccountType, a.IsActive,
           CAST(CASE WHEN EXISTS (SELECT 1 FROM JournalEntryLines l WHERE l.AccountId = a.Id) THEN 1 ELSE 0 END AS bit) AS HasPostings
    FROM Accounts a WHERE a.Code IN (${params.join(', ')})
  `);
  return new Map((r.recordset as AccountInfo[]).map((a) => [a.Code, a]));
}

export class AccountMapValidationError extends Error {
  constructor(public readonly problems: string[]) {
    super(problems.join(' '));
    this.name = 'AccountMapValidationError';
  }
}

/** Validates and saves a (partial) remapping atomically. Returns the old and new maps. */
export async function saveAccountMap(changes: Partial<Record<string, unknown>>, userId: number) {
  const db = await getDb();
  const tx = new sql.Transaction(db);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const txq: Queryable = { request: () => new sql.Request(tx) } as Queryable;
    const current = await getAccountMap(txq);
    const proposed: AccountMap = { ...current };
    for (const role of GL_ROLE_KEYS) {
      const v = changes[role];
      if (v !== undefined) proposed[role] = String(v).trim();
    }
    const info = await loadAccountInfo(txq, [...Object.values(current), ...Object.values(proposed)]);
    const problems = validateAccountMap(current, proposed, info);
    if (problems.length) throw new AccountMapValidationError(problems);

    for (const role of GL_ROLE_KEYS) {
      if (proposed[role] === current[role]) continue;
      await new sql.Request(tx)
        .input('key', sql.NVarChar, settingKey(role))
        .input('val', sql.NVarChar, proposed[role])
        .input('userId', sql.Int, userId)
        .query(`
          IF EXISTS (SELECT 1 FROM SystemSettings WHERE SettingKey = @key)
            UPDATE SystemSettings SET SettingValue = @val, UpdatedAt = GETDATE(), UpdatedBy = @userId WHERE SettingKey = @key
          ELSE
            INSERT INTO SystemSettings (SettingKey, SettingValue, SettingType, UpdatedAt, UpdatedBy) VALUES (@key, @val, 'accounting', GETDATE(), @userId)
        `);
    }
    await tx.commit();
    return { previous: current, mapping: proposed };
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
}
