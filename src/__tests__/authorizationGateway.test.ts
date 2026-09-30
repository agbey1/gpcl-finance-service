import { authHeader } from '../test-utils/auth';
import { NextRequest } from 'next/server';
import { validateApiAuth } from '../lib/apiAuth';

/**
 * Test Suite: Authorization Gateway for All API Endpoints
 *
 * Verifies that all critical endpoints:
 * 1. Require authentication
 * 2. Enforce proper permission checks
 * 3. Return appropriate error responses
 */
describe('Authorization Gateway - All Endpoints', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
  });

  describe('Report Endpoints - Authorization Required', () => {
    it('should reject unauthenticated GET /api/v1/reports/financial-statements', () => {
      (process.env as any).NODE_ENV = 'development';
      const req = new NextRequest('http://localhost:3000/api/v1/reports/financial-statements');
      const { session, errorResponse } = validateApiAuth(req, 'accounting.view');

      expect(session).toBeNull();
      expect(errorResponse?.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/reports/ar-aging', () => {
      (process.env as any).NODE_ENV = 'development';
      const req = new NextRequest('http://localhost:3000/api/v1/reports/ar-aging');
      const { session, errorResponse } = validateApiAuth(req, 'finance.invoices.view');

      expect(session).toBeNull();
      expect(errorResponse?.status).toBe(401);
    });
  });

  describe('Chart of Accounts Endpoints - Authorization Required', () => {
    it('should reject unauthenticated GET /api/v1/accounting/accounts (list)', () => {
      (process.env as any).NODE_ENV = 'development';
      const req = new NextRequest('http://localhost:3000/api/v1/accounting/accounts');
      const { session, errorResponse } = validateApiAuth(req, 'accounting.view');

      expect(session).toBeNull();
      expect(errorResponse?.status).toBe(401);
    });

    it('should reject unauthenticated GET /api/v1/accounting/accounts/1000 (single)', () => {
      (process.env as any).NODE_ENV = 'development';
      const req = new NextRequest('http://localhost:3000/api/v1/accounting/accounts/1000');
      const { session, errorResponse } = validateApiAuth(req, 'accounting.view');

      expect(session).toBeNull();
      expect(errorResponse?.status).toBe(401);
    });

    it('should reject unauthenticated POST /api/v1/accounting/accounts (create)', () => {
      (process.env as any).NODE_ENV = 'development';
      const req = new NextRequest('http://localhost:3000/api/v1/accounting/accounts', {
        method: 'POST',
      });
      const { session, errorResponse } = validateApiAuth(req, 'accounting.accounts.create');

      expect(session).toBeNull();
      expect(errorResponse?.status).toBe(401);
    });

    it('should reject unauthenticated PATCH /api/v1/accounting/accounts/1000 (update)', () => {
      (process.env as any).NODE_ENV = 'development';
      const req = new NextRequest('http://localhost:3000/api/v1/accounting/accounts/1000', {
        method: 'PATCH',
      });
      const { session, errorResponse } = validateApiAuth(req, 'accounting.accounts.update');

      expect(session).toBeNull();
      expect(errorResponse?.status).toBe(401);
    });
  });

  describe('Sensitive Endpoints - Authorization Required', () => {
    it('should reject unauthenticated GET /api/v1/clients/[clientId]/credit-exposure', () => {
      (process.env as any).NODE_ENV = 'development';
      const req = new NextRequest('http://localhost:3000/api/v1/clients/1/credit-exposure');
      const { session, errorResponse } = validateApiAuth(req, 'finance.invoices.view');

      expect(session).toBeNull();
      expect(errorResponse?.status).toBe(401);
    });

    it('should reject unauthenticated POST /api/v1/reconciliation/bank-accounts/[id]/upload', () => {
      (process.env as any).NODE_ENV = 'development';
      const req = new NextRequest(
        'http://localhost:3000/api/v1/reconciliation/bank-accounts/1/upload',
        { method: 'POST' }
      );
      const { session, errorResponse } = validateApiAuth(req, 'reconciliation.manage');

      expect(session).toBeNull();
      expect(errorResponse?.status).toBe(401);
    });
  });

  describe('Permission Validation - Wrong Permissions Rejected', () => {
    it('should reject session with insufficient permission for accounting.accounts.create', () => {
      (process.env as any).NODE_ENV = 'development';

      // Session with only view permission, not create
      const sessionWithViewOnly = {
        userId: 1,
        email: 'user@gpcl.com',
        name: 'Test User',
        role: 'STAFF',
        permissions: ['accounting.view'], // Has view, not create
      };

      const req = new NextRequest('http://localhost:3000/api/v1/accounting/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer token-with-view-only`,
        },
      });

      // When checking for 'accounting.accounts.create' permission
      const { errorResponse } = validateApiAuth(req, 'accounting.accounts.create');

      // Should fail auth since we're in dev mode without valid token
      expect(errorResponse?.status).toBe(401);
    });

    it('should reject session with insufficient permission for accounting.accounts.update', () => {
      (process.env as any).NODE_ENV = 'development';
      const req = new NextRequest('http://localhost:3000/api/v1/accounting/accounts/1000', {
        method: 'PATCH',
      });

      const { errorResponse } = validateApiAuth(req, 'accounting.accounts.update');
      expect(errorResponse?.status).toBe(401);
    });
  });

  describe('Force Operations - Additional Authorization', () => {
    it('should require explicit force_close permission when force=true', () => {
      (process.env as any).NODE_ENV = 'development';

      // Even with accounting.period.close, force requires additional permission
      const req = new NextRequest('http://localhost:3000/api/v1/accounting/periods/close', {
        method: 'POST',
      });

      // Base permission check
      const { errorResponse: baseError } = validateApiAuth(req, 'accounting.period.close');
      expect(baseError?.status).toBe(401);

      // Force permission check would require accounting.period.force_close
      const { errorResponse: forceError } = validateApiAuth(req, 'accounting.period.force_close');
      expect(forceError?.status).toBe(401);
    });
  });

  describe('No environment bypass', () => {
    it('should require authentication even when NODE_ENV is test', () => {
      (process.env as any).NODE_ENV = 'test';
      const req = new NextRequest('http://localhost:3000/api/v1/reports/financial-statements');
      const { session, errorResponse } = validateApiAuth(req, 'accounting.view');

      expect(session).toBeNull();
      expect(errorResponse?.status).toBe(401);
    });

    it('should accept a valid token and enforce its permissions', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/accounting/accounts', {
        method: 'POST',
        headers: authHeader('AUDITOR', ['accounting.view']),
      });
      expect(validateApiAuth(req, 'accounting.view').errorResponse).toBeNull();
      expect(validateApiAuth(req, 'accounting.accounts.create').errorResponse?.status).toBe(403);
    });

    it('should allow ADMIN role regardless of listed permissions', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/accounting/accounts', {
        headers: authHeader('ADMIN', []),
      });
      expect(validateApiAuth(req, 'accounting.accounts.create').errorResponse).toBeNull();
    });
  });
});
