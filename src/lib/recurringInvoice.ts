export type Frequency = 'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY';

export function advanceRunDate(current: Date, freq: Frequency): Date {
  const d = new Date(current);
  switch (freq) {
    case 'WEEKLY':
      d.setDate(d.getDate() + 7);
      return d;
    case 'MONTHLY':
      return addMonths(d, 1);
    case 'QUARTERLY':
      return addMonths(d, 3);
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      return d;
  }
}

function addMonths(d: Date, n: number): Date {
  const targetMonth = d.getMonth() + n;
  const result = new Date(d.getFullYear(), targetMonth, 1);
  const daysInTarget = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(d.getDate(), daysInTarget));
  return result;
}

export function isFrequency(s: unknown): s is Frequency {
  return s === 'MONTHLY' || s === 'WEEKLY' || s === 'QUARTERLY' || s === 'YEARLY';
}
