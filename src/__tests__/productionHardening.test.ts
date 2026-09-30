import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { signJwt, verifyJwt } from '../lib/auth';
import { validateJournalLines, UnbalancedJournalError, InvalidJournalError } from '../lib/accounting';
import { splitCreditAmount, computeLevies } from '../lib/ghanaLevies';
import { parseBusinessDate } from '../lib/dates';
import { toCents } from '../lib/decimalPrecision';
import { getEnv, resetEnvCache } from '../lib/env';
import { loginSchema, createUserSchema } from '../lib/validation';
import { withIdempotency } from '../lib/apiErrors';
import { POST as createInvoice } from '../app/api/v1/invoices/route';
import { POST as createPayment } from '../app/api/v1/payments/route';
import { POST as voidInvoice } from '../app/api/v1/invoices/[invoiceId]/void/route';
import { POST as createUser, GET as listUsers } from '../app/api/v1/users/route';
import { NextResponse } from 'next/server';
import { authHeader } from '../test-utils/auth';

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const session = { userId: 7, email: 'a@gpcl.com', name: 'A', role: 'AUDITOR', permissions: ['accounting.view'] };

describe('JWT verification', () => {
  it('produces a standard HMAC-SHA256 signature', () => {
    const token = signJwt(session, 600);
    const [h, p, sig] = token.split('.');
    const expected = createHmac('sha256', process.env.JWT_SECRET!).update(`${h}.${p}`).digest('base64url');
    expect(sig).toBe(expected);
  });

  it('rejects alg=none tokens', () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...session, role: 'ADMIN', exp })}.`;
    expect(verifyJwt(token)).toBeNull();
  });

  it('rejects a payload modified after signing (privilege escalation)', () => {
    const [h, , sig] = signJwt(session, 600).split('.');
    const exp = Math.floor(Date.now() / 1000) + 600;
    expect(verifyJwt(`${h}.${b64({ ...session, role: 'ADMIN', exp })}.${sig}`)).toBeNull();
  });

  it('rejects tokens signed with a different secret', () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const h = b64({ alg: 'HS256', typ: 'JWT' });
    const p = b64({ ...session, exp });
    const sig = createHmac('sha256', 'prod-fallback-jwt-secret-key-32-chars-long!').update(`${h}.${p}`).digest('base64url');
    expect(verifyJwt(`${h}.${p}.${sig}`)).toBeNull();
  });

  it('rejects tokens without an expiry', () => {
    const h = b64({ alg: 'HS256', typ: 'JWT' });
    const p = b64(session);
    const sig = createHmac('sha256', process.env.JWT_SECRET!).update(`${h}.${p}`).digest('base64url');
    expect(verifyJwt(`${h}.${p}.${sig}`)).toBeNull();
  });
});

describe('Environment validation', () => {
  afterEach(() => resetEnvCache());

  it('refuses to start with a missing or short JWT secret (no fallback)', () => {
    const saved = process.env.JWT_SECRET;
    try {
      process.env.JWT_SECRET = 'short';
      resetEnvCache();
      expect(() => getEnv()).toThrow(/JWT_SECRET/);
      delete process.env.JWT_SECRET;
      resetEnvCache();
      expect(() => getEnv()).toThrow(/JWT_SECRET/);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });

  it('defaults to encrypted SQL Server connections', () => {
    resetEnvCache();
    expect(getEnv().SQLSERVER_ENCRYPT).toBe(true);
    expect(getEnv().SQLSERVER_TRUST).toBe(false);
  });
});

describe('Journal line validation', () => {
  it('accepts a balanced entry', () => {
    expect(() =>
      validateJournalLines([
        { accountCode: '1100', debit: 120.1 },
        { accountCode: '4001', credit: 100.05 },
        { accountCode: '2100', credit: 20.05 },
      ])
    ).not.toThrow();
  });

  it('rejects entries that are off by one cent', () => {
    expect(() =>
      validateJournalLines([
        { accountCode: '1100', debit: 100.01 },
        { accountCode: '4001', credit: 100 },
      ])
    ).toThrow(UnbalancedJournalError);
  });

  it.each([
    [[{ accountCode: '1100', debit: 10 }]],
    [[{ accountCode: '1100', debit: -10 }, { accountCode: '4001', credit: -10 }]],
    [[{ accountCode: '1100', debit: 10, credit: 10 }, { accountCode: '4001', credit: 0, debit: 0 }]],
    [[{ accountCode: '1100', debit: NaN }, { accountCode: '4001', credit: NaN }]],
    [[{ accountCode: '', debit: 5 }, { accountCode: '4001', credit: 5 }]],
  ])('rejects malformed lines %#', (lines) => {
    expect(() => validateJournalLines(lines)).toThrow(InvalidJournalError);
  });
});

describe('Money helpers', () => {
  it('rounds to cents without float drift', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(1.005)).toBe(101);
  });

  it('splits a credit note in the invoice tax proportions and sums exactly', () => {
    const inv = computeLevies(1000); // 1000 net + 150 VAT + 25 NHIL + 25 GETFund
    const invoice = { TotalAmount: inv.gross, VatAmount: inv.vat, NhisAmount: inv.nhis, GetfundAmount: inv.getfund };
    const full = splitCreditAmount(toCents(inv.gross), invoice);
    expect(full).toEqual({ net: 100000, vat: 15000, nhis: 2500, getfund: 2500 });

    const partial = splitCreditAmount(33333, invoice);
    expect(partial.net + partial.vat + partial.nhis + partial.getfund).toBe(33333);
  });
});

describe('Business dates', () => {
  it('parses YYYY-MM-DD as UTC midnight', () => {
    expect(parseBusinessDate('2026-09-30').toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });
  it('rejects impossible dates', () => {
    expect(Number.isNaN(parseBusinessDate('2026-02-30').getTime())).toBe(true);
  });
});

describe('Password policy', () => {
  it('allows existing short passwords to log in but requires strong new ones', () => {
    expect(loginSchema.safeParse({ email: 'a@gpcl.com', password: 'abc' }).success).toBe(true);
    const weak = createUserSchema.safeParse({ name: 'Ab', email: 'a@gpcl.com', password: 'abcdefgh', role: 'AUDITOR' });
    expect(weak.success).toBe(false);
  });
});

describe('Idempotency', () => {
  const req = (key: string) => new NextRequest('http://localhost/api/v1/payments', { headers: { 'Idempotency-Key': key } });

  it('replays a successful response only for the same user', async () => {
    let calls = 0;
    const handler = async () => { calls++; return NextResponse.json({ n: calls }, { status: 201 }); };
    await withIdempotency(req('k1'), 'payments.create', 1, handler);
    const replay = await withIdempotency(req('k1'), 'payments.create', 1, handler);
    expect(await replay.json()).toEqual({ n: 1 });
    const otherUser = await withIdempotency(req('k1'), 'payments.create', 2, handler);
    expect(await otherUser.json()).toEqual({ n: 2 });
  });

  it('rejects a concurrent duplicate instead of running it twice', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow = async () => { await gate; return NextResponse.json({ ok: true }, { status: 201 }); };
    const first = withIdempotency(req('k2'), 'payments.create', 1, slow);
    const second = await withIdempotency(req('k2'), 'payments.create', 1, slow);
    expect(second.status).toBe(409);
    release();
    expect((await first).status).toBe(201);
  });
});

describe('Route guards and validation (no database needed)', () => {
  const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
    new NextRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  it('rejects unauthenticated invoice creation', async () => {
    const res = await createInvoice(post('http://localhost/api/v1/invoices', {}));
    expect(res.status).toBe(401);
  });

  it('rejects invoices with negative quantities or prices', async () => {
    const res = await createInvoice(
      post('http://localhost/api/v1/invoices', {
        clientId: 1,
        lineItems: [{ description: 'x', quantity: -5, unitPrice: 100 }],
      }, authHeader())
    );
    expect(res.status).toBe(400);
  });

  it('rejects unknown payment methods', async () => {
    const res = await createPayment(
      post('http://localhost/api/v1/payments', { clientId: 1, amount: 10, paymentMethod: 'BITCOIN' }, authHeader())
    );
    expect(res.status).toBe(400);
  });

  it('requires finance.invoices.void to void', async () => {
    const res = await voidInvoice(
      post('http://localhost/api/v1/invoices/5/void', { reason: 'duplicate' },
        authHeader('ACCOUNTS_RECEIVABLE_CLERK', ['finance.invoices.create'])),
      { params: Promise.resolve({ invoiceId: '5' }) }
    );
    expect(res.status).toBe(403);
  });

  it('requires a reason to void', async () => {
    const res = await voidInvoice(
      post('http://localhost/api/v1/invoices/5/void', {}, authHeader()),
      { params: Promise.resolve({ invoiceId: '5' }) }
    );
    expect(res.status).toBe(400);
  });

  it('does not let non-admins create or list users', async () => {
    const auditor = authHeader('AUDITOR', ['accounting.view']);
    const created = await createUser(
      post('http://localhost/api/v1/users', {
        name: 'Mallory', email: 'm@gpcl.com', password: 'LongEnough123', role: 'ADMIN',
      }, auditor)
    );
    expect(created.status).toBe(403);
    const listed = await listUsers(new NextRequest('http://localhost/api/v1/users', { headers: auditor }));
    expect(listed.status).toBe(403);
  });
});
