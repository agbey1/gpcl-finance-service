import { NextRequest } from 'next/server';
import { DEFAULT_ACCOUNT_MAP, validateAccountMap, type AccountInfo, type AccountMap } from '../lib/accountMap';
import { POST as reopenPeriod } from '../app/api/v1/accounting/periods/reopen/route';
import { PUT as putGlAccounts } from '../app/api/v1/settings/gl-accounts/route';
import { authHeader } from '../test-utils/auth';

const chart = (overrides: Partial<Record<string, Partial<AccountInfo>>> = {}) => {
  const base: Record<string, Omit<AccountInfo, 'Code'>> = {
    '1001': { AccountType: 'ASSET', IsActive: true, HasPostings: false },
    '1002': { AccountType: 'ASSET', IsActive: true, HasPostings: false },
    '1003': { AccountType: 'ASSET', IsActive: true, HasPostings: false },
    '1100': { AccountType: 'ASSET', IsActive: true, HasPostings: false },
    '1105': { AccountType: 'ASSET', IsActive: true, HasPostings: false },
    '2100': { AccountType: 'LIABILITY', IsActive: true, HasPostings: false },
    '2102': { AccountType: 'LIABILITY', IsActive: true, HasPostings: false },
    '2103': { AccountType: 'LIABILITY', IsActive: true, HasPostings: false },
    '4001': { AccountType: 'REVENUE', IsActive: true, HasPostings: false },
    '4002': { AccountType: 'REVENUE', IsActive: true, HasPostings: false },
  };
  const m = new Map<string, AccountInfo>();
  for (const [code, v] of Object.entries(base)) m.set(code, { Code: code, ...v, ...overrides[code] });
  return m;
};
const with_ = (changes: Partial<AccountMap>): AccountMap => ({ ...DEFAULT_ACCOUNT_MAP, ...changes });

describe('GL account mapping validation', () => {
  it('accepts the default mapping', () => {
    expect(validateAccountMap(DEFAULT_ACCOUNT_MAP, DEFAULT_ACCOUNT_MAP, chart())).toEqual([]);
  });

  it('accepts remapping to another account of the right type', () => {
    expect(validateAccountMap(DEFAULT_ACCOUNT_MAP, with_({ revenue: '4002', bank: '1003' }), chart())).toEqual([]);
  });

  it('rejects unknown, inactive and wrong-type accounts', () => {
    const errs = validateAccountMap(
      DEFAULT_ACCOUNT_MAP,
      with_({ revenue: '9999', bank: '1003', vat: '4002' }),
      chart({ '1003': { IsActive: false } }),
    );
    expect(errs.join(' ')).toMatch(/9999 does not exist/);
    expect(errs.join(' ')).toMatch(/1003 is inactive/);
    expect(errs.join(' ')).toMatch(/4002 is REVENUE, expected LIABILITY/);
  });

  it('rejects two roles sharing one account', () => {
    const errs = validateAccountMap(DEFAULT_ACCOUNT_MAP, with_({ nhil: '2100' }), chart());
    expect(errs.join(' ')).toMatch(/cannot use the same account \(2100\)/);
  });

  it('locks receivables, revenue and levy accounts once they have postings', () => {
    const used = chart({ '1100': { HasPostings: true }, '2100': { HasPostings: true } });
    expect(validateAccountMap(DEFAULT_ACCOUNT_MAP, with_({ receivables: '1105' }), used).join(' ')).toMatch(/cannot change from 1100/);
    // Unchanged locked roles are fine
    expect(validateAccountMap(DEFAULT_ACCOUNT_MAP, DEFAULT_ACCOUNT_MAP, used)).toEqual([]);
  });

  it('allows cash and bank to change even after postings', () => {
    const used = chart({ '1001': { HasPostings: true }, '1002': { HasPostings: true } });
    expect(validateAccountMap(DEFAULT_ACCOUNT_MAP, with_({ bank: '1003' }), used)).toEqual([]);
  });
});

const jsonReq = (url: string, method: string, body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('POST /api/v1/accounting/periods/reopen', () => {
  const url = 'http://localhost/api/v1/accounting/periods/reopen';
  const body = { year: 2026, periodNumber: 9, reason: 'Late supplier invoice correction' };

  it('requires authentication', async () => {
    expect((await reopenPeriod(jsonReq(url, 'POST', body))).status).toBe(401);
  });

  it('is refused for ADMIN (only SUPER_ADMIN may re-open)', async () => {
    expect((await reopenPeriod(jsonReq(url, 'POST', body, authHeader('ADMIN')))).status).toBe(403);
  });

  it('is refused for a role holding accounting.period.close', async () => {
    const res = await reopenPeriod(jsonReq(url, 'POST', body, authHeader('SENIOR_ACCOUNTANT', ['accounting.period.close'])));
    expect(res.status).toBe(403);
  });

  it('requires a meaningful reason', async () => {
    const res = await reopenPeriod(jsonReq(url, 'POST', { ...body, reason: 'oops' }, authHeader('SUPER_ADMIN')));
    expect(res.status).toBe(400);
  });

  it('validates the period', async () => {
    const res = await reopenPeriod(jsonReq(url, 'POST', { ...body, periodNumber: 13 }, authHeader('SUPER_ADMIN')));
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/v1/settings/gl-accounts', () => {
  const url = 'http://localhost/api/v1/settings/gl-accounts';

  it('requires admin.roles.manage', async () => {
    const res = await putGlAccounts(jsonReq(url, 'PUT', { mapping: { bank: '1003' } }, authHeader('AUDITOR', ['accounting.view'])));
    expect(res.status).toBe(403);
  });

  it('rejects unknown roles', async () => {
    const res = await putGlAccounts(jsonReq(url, 'PUT', { mapping: { payroll: '6100' } }, authHeader('ADMIN')));
    expect(res.status).toBe(400);
  });
});
