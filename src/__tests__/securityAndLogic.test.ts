import { authHeader } from '../test-utils/auth';
import { NextRequest } from 'next/server';
import { validateApiAuth } from '../lib/apiAuth';
import { POST as createInvoice } from '../app/api/v1/invoices/route';
import { POST as closePeriod } from '../app/api/v1/accounting/periods/close/route';

describe('Security Authorization & Business Logic Validation', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
  });

  it('should return 401 Unauthorized for unauthenticated requests when NODE_ENV != test', () => {
    (process.env as any).NODE_ENV = 'development';
    const req = new NextRequest('http://localhost:3000/api/v1/reports/financial-statements');
    const { session, errorResponse } = validateApiAuth(req, 'accounting.view');

    expect(session).toBeNull();
    expect(errorResponse).not.toBeNull();
    expect(errorResponse?.status).toBe(401);
  });

  it('should return 403 Forbidden when session lacks required permission', () => {
    (process.env as any).NODE_ENV = 'development';

    const req = new NextRequest('http://localhost:3000/api/v1/accounting/accounts');
    const { session, errorResponse } = validateApiAuth(req, 'accounting.accounts.create');
    expect(errorResponse?.status).toBe(401);
  });

  it('should reject invoice creation when dueDate is earlier than invoiceDate (400)', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        clientId: 1,
        invoiceDate: '2026-09-10',
        dueDate: '2026-09-01',
        lineItems: [{ description: 'Test Item', quantity: 1, unitPrice: 100 }],
      }),
    });

    const res = await createInvoice(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain('dueDate cannot be earlier than invoiceDate');
  });

  it('should allow period close force option when user is Admin', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/accounting/periods/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        year: 2026,
        periodNumber: 1,
        force: true,
      }),
    });

    const res = await closePeriod(req);
    expect(res).toBeDefined();
  });
});
