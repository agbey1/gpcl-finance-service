import { type ConnectionPool } from '@/lib/db';

export type CreditExposure = {
  clientId: number;
  creditLimit: number | null;
  outstandingAR: number;
  unappliedCredits: number;
  netExposure: number;
  available: number;
};

export async function computeCreditExposure(
  db: ConnectionPool,
  clientId: number,
): Promise<CreditExposure> {
  const r = await db.request().input('cid', clientId).query(`
    SELECT
      (SELECT TOP 1 CreditLimit FROM Clients WHERE Id = @cid) AS CreditLimit,
      ISNULL((
        SELECT SUM(BalanceDue) FROM Invoices
        WHERE ClientId = @cid
          AND ISNULL(Status,'') NOT IN ('VOID','CANCELLED')
          AND BalanceDue > 0
      ), 0) AS OutstandingAR,
      ISNULL((
        SELECT SUM(Amount - ISNULL(AmountApplied,0)) FROM CreditNotes
        WHERE ClientId = @cid
          AND Status = 'OPEN'
      ), 0) AS UnappliedCredits
  `);

  const row = r.recordset[0] || {};
  const creditLimit = row.CreditLimit != null ? Number(row.CreditLimit) : null;
  const outstandingAR = Number(row.OutstandingAR ?? 0);
  const unappliedCredits = Number(row.UnappliedCredits ?? 0);
  const netExposure = outstandingAR - unappliedCredits;
  const available = creditLimit == null ? Number.POSITIVE_INFINITY : creditLimit - netExposure;

  return { clientId, creditLimit, outstandingAR, unappliedCredits, netExposure, available };
}
