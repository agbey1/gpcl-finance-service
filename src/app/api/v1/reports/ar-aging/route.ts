import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.invoices.view');
  if (errorResponse) return errorResponse;

  try {

    const db = await getDb();
    const result = await db.request().query(`
      SELECT 
        c.Id AS ClientId,
        c.Name AS ClientName,
        ISNULL(SUM(CASE WHEN DATEDIFF(day, i.DueDate, GETDATE()) <= 0 THEN i.BalanceDue ELSE 0 END), 0) AS CurrentAmount,
        ISNULL(SUM(CASE WHEN DATEDIFF(day, i.DueDate, GETDATE()) BETWEEN 1 AND 30 THEN i.BalanceDue ELSE 0 END), 0) AS Days1To30,
        ISNULL(SUM(CASE WHEN DATEDIFF(day, i.DueDate, GETDATE()) BETWEEN 31 AND 60 THEN i.BalanceDue ELSE 0 END), 0) AS Days31To60,
        ISNULL(SUM(CASE WHEN DATEDIFF(day, i.DueDate, GETDATE()) BETWEEN 61 AND 90 THEN i.BalanceDue ELSE 0 END), 0) AS Days61To90,
        ISNULL(SUM(CASE WHEN DATEDIFF(day, i.DueDate, GETDATE()) > 90 THEN i.BalanceDue ELSE 0 END), 0) AS DaysOver90,
        ISNULL(SUM(i.BalanceDue), 0) AS TotalBalance
      FROM Clients c
      LEFT JOIN Invoices i ON c.Id = i.ClientId AND i.Status IN ('UNPAID', 'PARTIAL')
      GROUP BY c.Id, c.Name
      HAVING SUM(i.BalanceDue) > 0
      ORDER BY TotalBalance DESC
    `);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        reportDate: new Date().toISOString().slice(0, 10),
        agingSummary: result.recordset,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
