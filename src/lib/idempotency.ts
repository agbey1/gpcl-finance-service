export interface IdempotencyRecord {
  key: string;
  responseStatus: number;
  responseBody: unknown;
  createdAt: number;
}

// In-memory cache with expiration for idempotency key deduplication
// Process-local: correct for a single instance (the supported deployment). Running
// several replicas requires moving this to a shared store such as the database.
const idempotencyStore = new Map<string, IdempotencyRecord>();
const inFlight = new Set<string>();
const MAX_ENTRIES = 50_000;
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
export function saveIdempotentResponse(key: string, responseStatus: number, responseBody: unknown): void {
  if (!key || !key.trim()) return;
  const normalizedKey = normalizeIdempotencyKey(key);
  if (idempotencyStore.size >= MAX_ENTRIES) {
    // Evict the oldest entry (Map preserves insertion order) to bound memory.
    const oldest = idempotencyStore.keys().next().value;
    if (oldest !== undefined) idempotencyStore.delete(oldest);
  }
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
  inFlight.clear();
}

/** Marks a key as being processed. Returns false if it already is. */
export function reserveIdempotencyKey(key: string): boolean {
  const k = normalizeIdempotencyKey(key);
  if (inFlight.has(k)) return false;
  inFlight.add(k);
  return true;
}

export function releaseIdempotencyKey(key: string): void {
  inFlight.delete(normalizeIdempotencyKey(key));
}
