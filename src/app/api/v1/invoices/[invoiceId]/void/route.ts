import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { postJournalInTx, type JournalLine, ClosedPeriodError } from '@/lib/accounting';
import { validateApiAuth } from '@/lib/apiAuth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    // 1. Authorization check
    const { session, errorResponse } = validateApiAuth(req, 'finance.invoices.create');
    if (errorResponse) return errorResponse;

    const resolvedParams = await params;
    const invoiceId = parseInt(resolvedParams.invoiceId, 10);
    if (isNaN(invoiceId)) {
      return NextResponse.json({ status: 'ERROR', message: 'Invalid invoice ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { reason, voidDate } = body;

    const vDate = voidDate ? new Date(voidDate) : new Date();
    const db = await getDb();
    const tx = new sql.Transaction(db);
    await tx.begin();

    try {
      // 2. Fetch invoice with row lock
      const invRes = await new sql.Request(tx)
        .input('invId', invoiceId)
        .query(`
          SELECT Id, InvoiceNumber, TotalAmount, Status, InvoiceDate
          FROM Invoices WITH (UPDLOCK)
          WHERE Id = @invId
        `);

      if (!invRes.recordset.length) {
        await tx.rollback();
        return NextResponse.json({ status: 'ERROR', message: 'Invoice not found' }, { status: 404 });
      }

      const invoice = invRes.recordset[0];

      if (invoice.Status === 'VOID') {
        await tx.rollback();
        return NextResponse.json({ status: 'ERROR', message: 'Invoice is already voided' }, { status: 400 });
      }

      // 3. Mark Invoice status as VOID and zero out BalanceDue
      await new sql.Request(tx)
        .input('invId', invoiceId)
        .query(`
          UPDATE Invoices
          SET Status = 'VOID', BalanceDue = 0
          WHERE Id = @invId
        `);

      // 4. Post GL Reversing Entry (Debit Sales Revenue 4001, Credit AR 1100)
      const lines: JournalLine[] = [
        { accountCode: '4001', description: `Void Invoice Reversal: ${invoice.InvoiceNumber}`, debit: Number(invoice.TotalAmount) },
        { accountCode: '1100', description: `AR Cancellation: ${invoice.InvoiceNumber}`, credit: Number(invoice.TotalAmount) },
      ];

      const glResult = await postJournalInTx(tx, db, {
        entryDate: vDate,
        description: `Void Invoice ${invoice.InvoiceNumber} - ${reason || 'Cancelled by user'}`,
        reference: `VOID-${invoice.InvoiceNumber}`,
        sourceModule: 'INVOICE_VOID',
        sourceId: invoiceId,
        lines,
        postedBy: session?.userId || 1,
      });

      await tx.commit();

      return NextResponse.json(
        {
          status: 'SUCCESS',
          invoiceId,
          invoiceNumber: invoice.InvoiceNumber,
          invoiceStatus: 'VOID',
          reversingJournalEntry: glResult.entryNumber,
        },
        { status: 200 }
      );
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err: any) {
    if (err instanceof ClosedPeriodError) {
      return NextResponse.json(
        { status: 'ERROR', code: 'CLOSED_PERIOD_ERROR', message: err.message },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
