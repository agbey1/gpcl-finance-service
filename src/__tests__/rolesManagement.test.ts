import { NextRequest } from 'next/server';
import { POST as createRole, PUT as setPermissions } from '../app/api/v1/roles/route';
import { PATCH as updateRole, DELETE as deleteRole } from '../app/api/v1/roles/[id]/route';
import { roleAssignmentError } from '../lib/roles';
import { PERMISSION_IDS } from '../lib/permissionCatalog';
import { DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions';
import { authHeader } from '../test-utils/auth';

const jsonReq = (url: string, method: string, body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const ROLES = 'http://localhost/api/v1/roles';

describe('POST /api/v1/roles', () => {
  it('requires admin.roles.manage', async () => {
    const res = await createRole(jsonReq(ROLES, 'POST', { name: 'Cashier' }, authHeader('AUDITOR', ['accounting.view'])));
    expect(res.status).toBe(403);
  });

  it.each(['Finance Administrator', 'admin', 'SUPER_ADMIN', 'super administrator'])('rejects built-in name %p', async (name) => {
    const res = await createRole(jsonReq(ROLES, 'POST', { name }, authHeader('ADMIN')));
    expect(res.status).toBe(409);
  });

  it('rejects unknown permission IDs', async () => {
    const res = await createRole(jsonReq(ROLES, 'POST', { name: 'Cashier', permissions: ['finance.everything'] }, authHeader('ADMIN')));
    expect(res.status).toBe(400);
  });

  it('rejects names with unsupported characters', async () => {
    const res = await createRole(jsonReq(ROLES, 'POST', { name: 'Cashier<script>' }, authHeader('ADMIN')));
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/v1/roles (permissions)', () => {
  it('refuses to edit ADMIN, which has full access by role', async () => {
    const res = await setPermissions(jsonReq(ROLES, 'PUT', { roleId: 'ADMIN', permissions: [] }, authHeader('SUPER_ADMIN')));
    expect(res.status).toBe(400);
  });
});

describe('PATCH/DELETE /api/v1/roles/[id]', () => {
  it('cannot rename a built-in role', async () => {
    const res = await updateRole(jsonReq(`${ROLES}/AUDITOR`, 'PATCH', { name: 'Reviewer' }, authHeader('ADMIN')), ctx('AUDITOR'));
    expect(res.status).toBe(400);
  });

  it('cannot delete a built-in role', async () => {
    const res = await deleteRole(new NextRequest(`${ROLES}/SENIOR_ACCOUNTANT`, { method: 'DELETE', headers: authHeader('ADMIN') }), ctx('SENIOR_ACCOUNTANT'));
    expect(res.status).toBe(400);
  });

  it('cannot rename a custom role to a built-in name', async () => {
    const res = await updateRole(jsonReq(`${ROLES}/Chief%20Accountant`, 'PATCH', { name: 'AR Clerk' }, authHeader('ADMIN')), ctx('Chief%20Accountant'));
    expect(res.status).toBe(409);
  });
});

describe('roleAssignmentError', () => {
  const db = (exists: boolean) => ({
    request: () => {
      const r = { input: () => r, query: async () => ({ recordset: exists ? [{ x: 1 }] : [] }) };
      return r;
    },
  });

  it('only lets a Super Administrator grant SUPER_ADMIN', async () => {
    expect(await roleAssignmentError(db(false), 'SUPER_ADMIN', 'ADMIN')).toMatchObject({ status: 403 });
    expect(await roleAssignmentError(db(false), 'SUPER_ADMIN', 'SUPER_ADMIN')).toBeNull();
  });

  it('rejects roles that do not exist', async () => {
    expect(await roleAssignmentError(db(false), 'MADE_UP', 'ADMIN')).toMatchObject({ status: 400 });
    expect(await roleAssignmentError(db(true), 'Chief Accountant', 'ADMIN')).toBeNull();
  });
});

describe('permission catalog', () => {
  it('covers every permission granted to a built-in role', () => {
    const missing = Object.values(DEFAULT_ROLE_PERMISSIONS).flat().filter((p) => !PERMISSION_IDS.has(p));
    expect(missing).toEqual([]);
  });
});
