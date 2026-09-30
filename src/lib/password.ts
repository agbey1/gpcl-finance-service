import bcrypt from 'bcryptjs';

/**
 * Hashes a plain text password using bcrypt salt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compares a plain text password against a stored bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}
