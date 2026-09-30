import { getDb } from './db';

export interface PAYEBand {
  BandOrder: number;
  LowerInclusive: number;
  UpperExclusive: number | null;
  Rate: number;
}

export interface WHTRate {
  Id: number;
  PayeeType: string;
  Description: string;
  Rate: number;
}

export async function loadPAYEBands(year: number): Promise<PAYEBand[]> {
  const db = await getDb();
  for (let y = year; y > year - 5; y--) {
    const r = await db.request().input('y', y).query(`
      SELECT BandOrder, LowerInclusive, UpperExclusive, Rate
      FROM PAYEBands WHERE EffectiveYear = @y ORDER BY BandOrder
    `);
    if (r.recordset.length) {
      return r.recordset.map((row: any) => ({
        BandOrder: Number(row.BandOrder),
        LowerInclusive: Number(row.LowerInclusive),
        UpperExclusive: row.UpperExclusive == null ? null : Number(row.UpperExclusive),
        Rate: Number(row.Rate),
      }));
    }
  }
  throw new Error(`No PAYE bands configured for year ${year} or recent prior years`);
}

export function computePAYE(monthlyGross: number, bands: PAYEBand[]): number {
  let tax = 0;
  for (const band of bands) {
    if (monthlyGross <= band.LowerInclusive) break;
    const upper = band.UpperExclusive ?? Number.POSITIVE_INFINITY;
    const taxableInBand = Math.min(monthlyGross, upper) - band.LowerInclusive;
    if (taxableInBand > 0) tax += taxableInBand * band.Rate;
  }
  return +tax.toFixed(2);
}

export function reverseGrossFromPAYE(payeAmount: number, bands: PAYEBand[]): number {
  if (payeAmount <= 0) return 0;
  let accumTax = 0;
  for (const band of bands) {
    const upper = band.UpperExclusive ?? Number.POSITIVE_INFINITY;
    const bandSpan = upper - band.LowerInclusive;
    const taxIfFilled = bandSpan * band.Rate;
    if (accumTax + taxIfFilled >= payeAmount) {
      const taxInThisBand = payeAmount - accumTax;
      const grossInThisBand = band.Rate > 0 ? taxInThisBand / band.Rate : 0;
      return +(band.LowerInclusive + grossInThisBand).toFixed(2);
    }
    accumTax += taxIfFilled;
  }
  const topBand = bands[bands.length - 1];
  if (topBand.Rate <= 0) return 0;
  return +(topBand.LowerInclusive + (payeAmount - accumTax) / topBand.Rate).toFixed(2);
}

export async function loadWHTRates(year: number): Promise<WHTRate[]> {
  const db = await getDb();
  for (let y = year; y > year - 5; y--) {
    const r = await db.request().input('y', y).query(`
      SELECT Id, PayeeType, Description, Rate
      FROM WHTRates WHERE EffectiveYear = @y AND IsActive = 1 ORDER BY PayeeType
    `);
    if (r.recordset.length) {
      return r.recordset.map((row: any) => ({
        Id: Number(row.Id),
        PayeeType: row.PayeeType,
        Description: row.Description,
        Rate: Number(row.Rate),
      }));
    }
  }
  throw new Error(`No WHT rates configured for year ${year} or recent prior years`);
}

export function classifyWHTPayeeType(description: string, rates: WHTRate[]): string | null {
  const tagMatch = description.match(/\[WHT:([A-Z_]+)\]/);
  if (tagMatch) {
    const tagged = tagMatch[1];
    if (rates.some(r => r.PayeeType === tagged)) return tagged;
  }
  const lower = description.toLowerCase();
  if (/rent.*commercial|commercial.*rent/.test(lower) && rates.some(r => r.PayeeType === 'RENT_COMMERCIAL')) return 'RENT_COMMERCIAL';
  if (/\brent\b/.test(lower) && rates.some(r => r.PayeeType === 'RENT_RESIDENTIAL')) return 'RENT_RESIDENTIAL';
  if (/\bdirector/.test(lower) && rates.some(r => r.PayeeType === 'DIRECTORS_FEES')) return 'DIRECTORS_FEES';
  if (/dividend/.test(lower) && rates.some(r => r.PayeeType === 'DIVIDENDS')) return 'DIVIDENDS';
  if (/royalty|royalties/.test(lower) && rates.some(r => r.PayeeType === 'ROYALTY')) return 'ROYALTY';
  if (/interest/.test(lower) && rates.some(r => r.PayeeType === 'INTEREST_NONBANK')) return 'INTEREST_NONBANK';
  if (/non[- ]?resident/.test(lower) && rates.some(r => r.PayeeType === 'SERVICES_NONRESIDENT')) return 'SERVICES_NONRESIDENT';
  if (/\bcontractor|contract\b/.test(lower) && rates.some(r => r.PayeeType === 'CONTRACTOR')) return 'CONTRACTOR';
  if (/supply|supplier|goods/.test(lower) && rates.some(r => r.PayeeType === 'GOODS_SUPPLY')) return 'GOODS_SUPPLY';
  if (/service/.test(lower) && rates.some(r => r.PayeeType === 'SERVICES_RESIDENT')) return 'SERVICES_RESIDENT';
  return null;
}
