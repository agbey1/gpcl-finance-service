import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.invoices.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const clientId = url.searchParams.get('clientId');
    const invoiceId = url.searchParams.get('invoiceId');
    const skip = Math.max(0, parseInt(url.searchParams.get('skip') || '0', 10) || 0);
    const take = Math.min(200, Math.max(1, parseInt(url.searchParams.get('take') || '10', 10) || 10));

    let query = `
      SELECT
        i.Id, i.InvoiceNumber, i.ClientId, COALESCE(i.ClientName, c.Name) AS ClientName,
        i.InvoiceDate, i.DueDate, i.SubTotal, i.VatAmount, i.NhisAmount, i.GetfundAmount,
        i.TotalAmount, i.BalanceDue, i.Status, i.CreatedAt
      FROM Invoices i
      LEFT JOIN Clients c ON c.Id = i.ClientId
      WHERE 1=1
    `;

    const db = await getDb();
    const request = db.request();

    if (invoiceId) {
      query += ` AND i.Id = @invoiceId`;
      request.input('invoiceId', parseInt(invoiceId, 10) || 0);
    }

    if (status) {
      query += ` AND i.Status = @status`;
      request.input('status', status);
    }

    if (clientId) {
      query += ` AND i.ClientId = @clientId`;
      request.input('clientId', parseInt(clientId, 10) || 0);
    }

    query += ` ORDER BY i.Id DESC OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY`;
    request.input('skip', skip);
    request.input('take', take);

    const result = await request.query(query);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        invoices: result.recordset,
        pagination: { skip, take, count: result.recordset.length },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/invoices/query');
  }
}
