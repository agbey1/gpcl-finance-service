export const GL_BALANCE_TOLERANCE = 0.001;

export function roundMonetary(amount: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function sumMonetary(values: number[], decimals = 2): number {
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  return roundMonetary(sum, decimals);
}

export function validateGLBalance(debitTotal: number, creditTotal: number): boolean {
  return Math.abs(debitTotal - creditTotal) <= GL_BALANCE_TOLERANCE;
}

/** Converts a monetary amount to integer cents so balance checks are exact. */
export function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}
