import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

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
        i.Id, i.InvoiceNumber, i.ClientId, COALESCE(i.ClientName, c.Name) AS ClientName,
        i.InvoiceDate, i.DueDate, i.SubTotal, i.VatAmount, i.NhisAmount, i.GetfundAmount,
        i.TotalAmount, i.BalanceDue, i.Status, i.CreatedAt
      FROM Invoices i
      LEFT JOIN Clients c ON c.Id = i.ClientId
      WHERE i.Id = @id
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

    // InvoiceLines exists from migration 010; invoices created earlier have no lines.
    const linesResult = await db.request().input('invoiceId', id).query(`
      IF OBJECT_ID('dbo.InvoiceLines', 'U') IS NOT NULL
        SELECT LineNumber, Description, Quantity, UnitPrice, LineTotal
        FROM InvoiceLines WHERE InvoiceId = @invoiceId ORDER BY LineNumber
      ELSE
        SELECT TOP 0 1 AS LineNumber
    `);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        invoice: {
          ...invoice,
          lines: linesResult.recordset,
          payments: paymentsResult.recordset,
          creditNotes: creditsResult.recordset,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/invoices/[invoiceId]/details');
  }
}
