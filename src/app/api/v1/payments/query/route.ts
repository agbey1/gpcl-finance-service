import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.payments.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get('clientId');
    const invoiceId = url.searchParams.get('invoiceId');
    const paymentMethod = url.searchParams.get('paymentMethod');
    const skip = Math.max(0, parseInt(url.searchParams.get('skip') || '0', 10) || 0);
    const take = Math.min(200, Math.max(1, parseInt(url.searchParams.get('take') || '10', 10) || 10));

    let query = `
      SELECT
        p.Id, p.PaymentNumber, p.ClientId, c.Name AS ClientName, p.InvoiceId, i.InvoiceNumber,
        p.PaymentDate, p.Amount, p.PaymentMethod, p.Reference, p.BankAccountId, p.CreatedAt,
        ISNULL(p.Status, 'POSTED') AS Status, p.ReversedAt, p.ReversalReason
      FROM Payments p
      LEFT JOIN Clients c ON c.Id = p.ClientId
      LEFT JOIN Invoices i ON i.Id = p.InvoiceId
      WHERE 1=1
    `;

    const db = await getDb();
    const request = db.request();

    if (clientId) {
      query += ` AND p.ClientId = @clientId`;
      request.input('clientId', parseInt(clientId, 10) || 0);
    }

    if (invoiceId) {
      query += ` AND p.InvoiceId = @invoiceId`;
      request.input('invoiceId', parseInt(invoiceId, 10) || 0);
    }

    if (paymentMethod) {
      query += ` AND p.PaymentMethod = @paymentMethod`;
      request.input('paymentMethod', paymentMethod);
    }

    query += ` ORDER BY p.PaymentDate DESC, p.Id DESC OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY`;
    request.input('skip', skip);
    request.input('take', take);

    const result = await request.query(query);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        payments: result.recordset,
        pagination: { skip, take, count: result.recordset.length },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/payments/query');
  }
}
