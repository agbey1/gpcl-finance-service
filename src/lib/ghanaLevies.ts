/**
 * Ghana statutory levies calculation engine for standalone gpcl-finance-service.
 *
 * GPCL operates under the Ghana VAT regime where the selling price of a
 * taxable supply attracts THREE separate statutory levies:
 *   - VAT     — 15.0%
 *   - NHIS    — 2.5%
 *   - GETFund — 2.5%
 */

export const VAT_RATE = 0.15;
export const NHIS_RATE = 0.025;
export const GETFUND_RATE = 0.025;
export const TOTAL_LEVY_RATE = VAT_RATE + NHIS_RATE + GETFUND_RATE; // 20%

export type LevyBreakdown = {
  net: number;
  vat: number;
  nhis: number;
  getfund: number;
  gross: number;
};

export function computeLevies(netSellingPrice: number): LevyBreakdown {
  const net = round2(netSellingPrice);
  const vat = round2(net * VAT_RATE);
  const nhis = round2(net * NHIS_RATE);
  const getfund = round2(net * GETFUND_RATE);
  return { net, vat, nhis, getfund, gross: round2(net + vat + nhis + getfund) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
