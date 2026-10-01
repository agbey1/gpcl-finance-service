import { NextRequest } from 'next/server';
import { POST as reversePayment } from '../app/api/v1/payments/[paymentId]/reverse/route';
import { POST as createInvoice } from '../app/api/v1/invoices/route';
import { PERMISSION_IDS } from '../lib/permissionCatalog';
import { DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions';
import { authHeader } from '../test-utils/auth';

const jsonReq = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const ctx = (paymentId: string) => ({ params: Promise.resolve({ paymentId }) });
const URL_ = 'http://localhost/api/v1/payments/5/reverse';

describe('POST /api/v1/payments/[id]/reverse', () => {
  it('requires authentication', async () => {
    expect((await reversePayment(jsonReq(URL_, { reason: 'Cheque bounced' }), ctx('5'))).status).toBe(401);
  });

  it('is refused for an AR clerk (can record but not reverse payments)', async () => {
    const res = await reversePayment(
      jsonReq(URL_, { reason: 'Cheque bounced' }, authHeader('ACCOUNTS_RECEIVABLE_CLERK', DEFAULT_ROLE_PERMISSIONS.ACCOUNTS_RECEIVABLE_CLERK)),
      ctx('5'),
    );
    expect(res.status).toBe(403);
  });

  it('requires a reason', async () => {
    const res = await reversePayment(jsonReq(URL_, { reason: 'no' }, authHeader('SENIOR_ACCOUNTANT', ['finance.payments.reverse'])), ctx('5'));
    expect(res.status).toBe(400);
  });

  it('rejects an invalid payment id', async () => {
    const res = await reversePayment(jsonReq(URL_, { reason: 'Cheque bounced' }, authHeader('ADMIN')), ctx('abc'));
    expect(res.status).toBe(400);
  });

  it('is granted to Senior Accountants and catalogued', () => {
    expect(PERMISSION_IDS.has('finance.payments.reverse')).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.SENIOR_ACCOUNTANT).toContain('finance.payments.reverse');
    expect(DEFAULT_ROLE_PERMISSIONS.ACCOUNTS_RECEIVABLE_CLERK).not.toContain('finance.payments.reverse');
  });
});

describe('POST /api/v1/invoices invoice date', () => {
  it('rejects a future invoice date', async () => {
    const future = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const res = await createInvoice(
      jsonReq('http://localhost/api/v1/invoices', {
        clientId: 1,
        invoiceDate: future,
        lineItems: [{ description: 'Printing', quantity: 1, unitPrice: 100 }],
        applyGhanaLevies: true,
      }, { ...authHeader('ADMIN'), 'Idempotency-Key': `t-${Date.now()}` }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/future/);
  });
});
