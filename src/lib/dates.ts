import { z } from 'zod';

/** A business date as YYYY-MM-DD, or a full ISO-8601 timestamp. */
export const businessDate = z
  .string()
  .refine((s) => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(s) && !Number.isNaN(parseBusinessDate(s).getTime()), {
    message: 'Must be a valid date (YYYY-MM-DD or ISO-8601).',
  });

/**
 * Parses YYYY-MM-DD as midnight UTC (Ghana is UTC+0 all year), or an ISO
 * timestamp as-is. Rejects impossible dates such as 2026-02-30.
 */
export function parseBusinessDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const date = new Date(Date.UTC(y, mo - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
      return new Date(NaN);
    }
    return date;
  }
  return new Date(s);
}
