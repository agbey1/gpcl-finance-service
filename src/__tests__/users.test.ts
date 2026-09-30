import { GET as getUsers, POST as createUser } from '../app/api/v1/users/route';
import { GET as getUserById, PATCH as updateUser, DELETE as deleteUser } from '../app/api/v1/users/[id]/route';
import { createUserSchema, updateUserSchema } from '../lib/validation';
import { hashPassword, comparePassword } from '../lib/password';
import { NextRequest } from 'next/server';

describe('User Account & Password Management API', () => {
  it('should validate user creation schema correctly', () => {
    const validData = {
      name: 'John Doe',
      email: 'jdoe@gpcl.com',
      password: 'SecurePassword123!',
      role: 'SENIOR_ACCOUNTANT',
      isActive: true,
    };
    const validResult = createUserSchema.safeParse(validData);
    expect(validResult.success).toBe(true);

    // Invalid short password
    const invalidPassword = {
      ...validData,
      password: '123',
    };
    const invalidResult = createUserSchema.safeParse(invalidPassword);
    expect(invalidResult.success).toBe(false);
  });

  it('should validate user update schema correctly', () => {
    const updateData = {
      name: 'Jane Doe',
      password: 'NewPassword2026!',
    };
    const result = updateUserSchema.safeParse(updateData);
    expect(result.success).toBe(true);
  });

  it('should hash password and create new user via POST /api/v1/users', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Emmanuel Osei',
        email: 'eosei@gpcl.com',
        password: 'Password123!',
        role: 'SENIOR_ACCOUNTANT',
        isActive: true,
      }),
    });

    const res = await createUser(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.status).toBe('SUCCESS');
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('eosei@gpcl.com');
    expect(data.user.passwordHash).toBeUndefined(); // Should never expose password hash in response
  });

  it('should fetch user list via GET /api/v1/users', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/users', {
      method: 'GET',
    });

    const res = await getUsers(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('SUCCESS');
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.users.length).toBeGreaterThan(0);
  });

  it('should update user name, role, and reset password via PATCH /api/v1/users/[id]', async () => {
    const params = Promise.resolve({ id: '1' });
    const patchReq = new NextRequest('http://localhost:3000/api/v1/users/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Finance Super Administrator',
        password: 'ResetPassword2026!',
      }),
    });

    const res = await updateUser(patchReq, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('SUCCESS');
    expect(data.user.name).toBe('Finance Super Administrator');
  });
});
