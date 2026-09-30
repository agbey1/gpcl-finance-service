import { signJwt, verifyJwt } from '../lib/auth';
import { hashPassword, comparePassword } from '../lib/password';

describe('Auth Security Module', () => {
  const sampleUser = {
    userId: 1,
    email: 'admin@gpcl.com',
    name: 'Finance Admin',
    role: 'ADMIN',
    permissions: ['accounting.view', 'finance.invoices.create'],
  };

  it('should sign and verify valid JWT token using HMAC-SHA256', () => {
    const token = signJwt(sampleUser, 3600);
    expect(token).toBeDefined();
    expect(token.split('.')).toHaveLength(3);

    const verified = verifyJwt(token);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe(sampleUser.email);
    expect(verified?.role).toBe(sampleUser.role);
  });

  it('should reject tampered JWT signature', () => {
    const token = signJwt(sampleUser, 3600);
    const parts = token.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.invalid_signature_hash`;

    const verified = verifyJwt(tamperedToken);
    expect(verified).toBeNull();
  });

  it('should reject expired JWT token', () => {
    const expiredToken = signJwt(sampleUser, -120); // Expired 2 minutes ago (beyond clock-skew leeway)
    const verified = verifyJwt(expiredToken);
    expect(verified).toBeNull();
  });

  it('should securely hash and verify passwords using bcrypt', async () => {
    const rawPassword = 'SecurePassword2026!';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toEqual(rawPassword);
    expect(hash.startsWith('$2')).toBe(true);

    const isValid = await comparePassword(rawPassword, hash);
    expect(isValid).toBe(true);

    const isWrongValid = await comparePassword('WrongPassword123!', hash);
    expect(isWrongValid).toBe(false);
  });
});
