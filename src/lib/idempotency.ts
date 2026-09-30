export interface IdempotencyRecord {
  key: string;
  responseStatus: number;
  responseBody: any;
  createdAt: number;
}

// In-memory cache with expiration for idempotency key deduplication
const idempotencyStore = new Map<string, IdempotencyRecord>();
const EXPIRY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Periodic automated cleanup of expired idempotency keys
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of idempotencyStore.entries()) {
      if (now - record.createdAt > EXPIRY_WINDOW_MS) {
        idempotencyStore.delete(key);
      }
    }
  }, 60 * 60 * 1000);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

/**
 * Normalizes an Idempotency-Key header value
 */
export function normalizeIdempotencyKey(key: string): string {
  return key.trim().toLowerCase();
}

/**
 * Checks if an Idempotency-Key has already been processed
 */
export function getIdempotentResponse(key: string): IdempotencyRecord | null {
  if (!key || !key.trim()) return null;
  const normalizedKey = normalizeIdempotencyKey(key);
  const record = idempotencyStore.get(normalizedKey);
  if (!record) return null;

  // Check if expired
  if (Date.now() - record.createdAt > EXPIRY_WINDOW_MS) {
    idempotencyStore.delete(normalizedKey);
    return null;
  }

  return record;
}

/**
 * Stores a processed response payload against an Idempotency-Key
 */
export function saveIdempotentResponse(key: string, responseStatus: number, responseBody: any): void {
  if (!key || !key.trim()) return;
  const normalizedKey = normalizeIdempotencyKey(key);
  idempotencyStore.set(normalizedKey, {
    key: normalizedKey,
    responseStatus,
    responseBody,
    createdAt: Date.now(),
  });
}

/**
 * Clears stored idempotency keys (used for test teardown)
 */
export function clearIdempotencyStore(): void {
  idempotencyStore.clear();
}
