import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.invoices.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const clientId = url.searchParams.get('clientId');
    const invoiceId = url.searchParams.get('invoiceId');
    const skip = parseInt(url.searchParams.get('skip') || '0', 10);
    const take = parseInt(url.searchParams.get('take') || '10', 10);

    let query = `
      SELECT
        Id,
        InvoiceNumber,
        ClientId,
        InvoiceDate,
        DueDate,
        SubTotal,
        VatAmount,
        NhisAmount,
        GetfundAmount,
        TotalAmount,
        BalanceDue,
        Status,
        CreatedAt
      FROM Invoices
      WHERE 1=1
    `;

    const db = await getDb();
    const request = db.request();

    if (invoiceId) {
      query += ` AND Id = @invoiceId`;
      request.input('invoiceId', parseInt(invoiceId, 10));
    }

    if (status) {
      query += ` AND Status = @status`;
      request.input('status', status);
    }

    if (clientId) {
      query += ` AND ClientId = @clientId`;
      request.input('clientId', parseInt(clientId, 10));
    }

    query += ` ORDER BY CreatedAt DESC OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY`;
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
    return NextResponse.json({ status: 'ERROR', message: err.message || 'Internal server error' }, { status: 500 });
  }
}
