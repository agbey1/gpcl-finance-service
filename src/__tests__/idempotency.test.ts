import { getIdempotentResponse, saveIdempotentResponse } from '../lib/idempotency';
import { getSessionFromRequest, validateApiAuth } from '../lib/apiAuth';
import { NextRequest } from 'next/server';
import { signJwt } from '../lib/auth';

describe('Idempotency Key & Authorization Verification', () => {
  it('should cache and return saved response for identical idempotency key', () => {
    const testKey = 'test-idempotency-key-uuid-12345';
    const payload = { status: 'SUCCESS', invoiceId: 42, invoiceNumber: 'INV-2026-000042' };

    saveIdempotentResponse(testKey, 201, payload);

    const cached = getIdempotentResponse(testKey);
    expect(cached).not.toBeNull();
    expect(cached?.responseStatus).toBe(201);
    expect((cached?.responseBody as { invoiceNumber: string }).invoiceNumber).toBe('INV-2026-000042');
  });

  it('should return null for unknown idempotency key', () => {
    const cached = getIdempotentResponse('non-existent-key');
    expect(cached).toBeNull();
  });

  it('should extract session from valid Authorization Bearer header', () => {
    const token = signJwt({
      userId: 5,
      email: 'accountant@gpcl.com',
      name: 'Senior Accountant',
      role: 'ACCOUNTANT',
      permissions: ['accounting.journal.post', 'finance.invoices.create'],
    });

    const req = new NextRequest('http://localhost:3000/api/v1/invoices', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const session = getSessionFromRequest(req);
    expect(session).not.toBeNull();
    expect(session?.email).toBe('accountant@gpcl.com');
    expect(session?.role).toBe('ACCOUNTANT');
  });
});
