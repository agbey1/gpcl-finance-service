import { toCents } from './decimalPrecision';

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

/**
 * Splits a tax-inclusive credit amount in the same proportions as the invoice
 * it credits, so revenue and each levy liability are reduced consistently.
 * Levies are rounded individually; revenue takes the rounding remainder.
 */
export function splitCreditAmount(
  amountCents: number,
  invoice: { TotalAmount: number; VatAmount: number; NhisAmount: number; GetfundAmount: number },
) {
  const totalCents = toCents(Number(invoice.TotalAmount));
  const share = (x: number) => (totalCents > 0 ? Math.round((amountCents * toCents(Number(x))) / totalCents) : 0);
  const vat = share(invoice.VatAmount);
  const nhis = share(invoice.NhisAmount);
  const getfund = share(invoice.GetfundAmount);
  return { net: amountCents - vat - nhis - getfund, vat, nhis, getfund };
}
