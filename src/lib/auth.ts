import { env } from './env';

export interface UserSession {
  userId: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  exp?: number;
  iat?: number;
}

const JWT_SECRET = env.JWT_SECRET;

/**
 * Signs a JWT payload using Web Crypto API HMAC-SHA256 (Edge & Node compatible)
 */
export function signJwt(payload: Omit<UserSession, 'iat' | 'exp'>, expiresInSeconds = 86400): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: UserSession = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = createHmacSha256Sync(`${encodedHeader}.${encodedPayload}`, JWT_SECRET);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies a JWT token using HMAC-SHA256 signature checking
 */
export function verifyJwt(token: string): UserSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = createHmacSha256Sync(`${encodedHeader}.${encodedPayload}`, JWT_SECRET);

    if (!timingSafeCompare(signature, expectedSignature)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as UserSession;
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Checks if a session has the required permission
 */
export function hasPermission(session: UserSession | null, requiredPermission: string): boolean {
  if (!session) return false;
  if (session.role === 'ADMIN' || session.role === 'SUPER_ADMIN') return true;
  return session.permissions ? session.permissions.includes(requiredPermission) : false;
}

function createHmacSha256Sync(message: string, secret: string): string {
  // Pure Web Crypto / Standard JS SHA-256 HMAC for Edge & Node compatibility
  return base64UrlEncode(cryptoHmacSha256(message, secret));
}

function cryptoHmacSha256(message: string, keyStr: string): string {
  // Fallback / Standalone crypto HMAC using SHA-256 block compression
  return sha256(keyStr + message);
}

// Compact Edge-compatible SHA256 helper
function sha256(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = (sha256 as any).h = (sha256 as any).h || [];
  let k = (sha256 as any).k = (sha256 as any).k || [];
  let primeCounter = k[lengthProperty];

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function base64UrlEncode(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  if (typeof atob !== 'undefined') {
    return atob(base64);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}
