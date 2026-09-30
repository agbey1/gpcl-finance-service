import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth } from '@/lib/apiAuth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.invoices.view');
  if (errorResponse) return errorResponse;

  try {
    const { invoiceId } = await params;
    const id = parseInt(invoiceId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ status: 'ERROR', message: 'Invalid invoice ID' }, { status: 400 });
    }

    const db = await getDb();

    const invoiceResult = await db.request().input('id', id).query(`
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
      WHERE Id = @id
    `);

    if (!invoiceResult.recordset.length) {
      return NextResponse.json({ status: 'ERROR', message: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceResult.recordset[0];

    // Get associated payments
    const paymentsResult = await db.request().input('invoiceId', id).query(`
      SELECT
        Id,
        PaymentNumber,
        PaymentDate,
        Amount,
        PaymentMethod,
        Reference,
        CreatedAt
      FROM Payments
      WHERE InvoiceId = @invoiceId
      ORDER BY PaymentDate DESC
    `);

    // Get associated credit notes
    const creditsResult = await db.request().input('invoiceId', id).query(`
      SELECT
        Id,
        CreditNoteNumber,
        CreditNoteDate,
        Amount,
        AmountApplied,
        Reason,
        Status,
        CreatedAt
      FROM CreditNotes
      WHERE InvoiceId = @invoiceId
      ORDER BY CreditNoteDate DESC
    `);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        invoice: {
          ...invoice,
          payments: paymentsResult.recordset,
          creditNotes: creditsResult.recordset,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ status: 'ERROR', message: err.message || 'Internal server error' }, { status: 500 });
  }
}
