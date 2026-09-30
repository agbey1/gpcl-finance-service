interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const tracker = new Map<string, RateLimitRecord>();

// Periodic garbage collection to prevent memory leaks in long-running instances
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of tracker.entries()) {
      if (now > record.resetTime) {
        tracker.delete(key);
      }
    }
  }, 60 * 1000);
}

export interface RateLimitOptions {
  windowMs?: number; // Default 1 minute
  maxRequests?: number; // Default 100 requests per window
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): { isAllowed: boolean; current: number; limit: number; resetTime: number } {
  const windowMs = options.windowMs || 60 * 1000;
  const maxRequests = options.maxRequests || 100;
  const now = Date.now();

  const record = tracker.get(key);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    tracker.set(key, newRecord);
    return { isAllowed: true, current: 1, limit: maxRequests, resetTime: newRecord.resetTime };
  }

  record.count += 1;

  if (record.count > maxRequests) {
    return { isAllowed: false, current: record.count, limit: maxRequests, resetTime: record.resetTime };
  }

  return { isAllowed: true, current: record.count, limit: maxRequests, resetTime: record.resetTime };
}
