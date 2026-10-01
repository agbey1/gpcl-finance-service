import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, sql } from '@/lib/db';
import { postJournalInTx, toCents, type JournalLine } from '@/lib/accounting';
import { validateApiAuth } from '@/lib/apiAuth';
import { ApiError, errorResponse } from '@/lib/apiErrors';
import { businessDate, parseBusinessDate } from '@/lib/dates';
import { logAudit } from '@/lib/auditLog';
import { getAccountMap } from '@/lib/accountMap';

const voidSchema = z.object({
  reason: z.string().trim().min(3, 'A reason is required to void an invoice.').max(400),
  voidDate: businessDate.optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'finance.invoices.void');
  if (authError || !session) return authError!;

  try {
    const { invoiceId: rawId } = await params;
    const invoiceId = Number(rawId);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      throw new ApiError(400, 'Invalid invoice ID');
    }

    const body = await req.json().catch(() => ({}));
    const { reason, voidDate } = voidSchema.parse(body);
    const vDate = voidDate ? parseBusinessDate(voidDate) : new Date();

    const db = await getDb();
    const gl = await getAccountMap(db);
    const tx = new sql.Transaction(db);
    await tx.begin();
    let invoice: {
      InvoiceNumber: string; SubTotal: number; VatAmount: number; NhisAmount: number;
      GetfundAmount: number; TotalAmount: number; BalanceDue: number; Status: string;
    };
    let reversingJournalEntry: string;
    try {
      const invRes = await new sql.Request(tx)
        .input('invId', invoiceId)
        .query(`
          SELECT InvoiceNumber, SubTotal, VatAmount, NhisAmount, GetfundAmount, TotalAmount, BalanceDue, Status
          FROM Invoices WITH (UPDLOCK, ROWLOCK)
          WHERE Id = @invId
        `);
      invoice = invRes.recordset[0];
      if (!invoice) throw new ApiError(404, 'Invoice not found');
      if (invoice.Status === 'VOID') throw new ApiError(409, 'Invoice is already voided');

      // Voiding reverses the whole invoice, which is only correct while nothing
      // has been settled against it. Otherwise AR and cash would disagree.
      if (toCents(Number(invoice.BalanceDue)) !== toCents(Number(invoice.TotalAmount))) {
        throw new ApiError(
          409,
          'Invoice has payments or credit notes applied and cannot be voided. Issue a credit note instead.',
          'INVOICE_HAS_SETTLEMENTS'
        );
      }

      await new sql.Request(tx)
        .input('invId', invoiceId)
        .query(`UPDATE Invoices SET Status = 'VOID', BalanceDue = 0 WHERE Id = @invId`);

      // Mirror of the original posting: debit revenue and each tax liability, credit AR.
      const ref = invoice.InvoiceNumber;
      const lines: JournalLine[] = [
        { accountCode: gl.revenue, description: `Void Invoice Reversal: ${ref}`, debit: Number(invoice.SubTotal) },
      ];
      if (Number(invoice.VatAmount) > 0) lines.push({ accountCode: gl.vat, description: `VAT reversal: ${ref}`, debit: Number(invoice.VatAmount) });
      if (Number(invoice.NhisAmount) > 0) lines.push({ accountCode: gl.nhil, description: `NHIL reversal: ${ref}`, debit: Number(invoice.NhisAmount) });
      if (Number(invoice.GetfundAmount) > 0) lines.push({ accountCode: gl.getfund, description: `GETFund reversal: ${ref}`, debit: Number(invoice.GetfundAmount) });
      lines.push({ accountCode: gl.receivables, description: `AR Cancellation: ${ref}`, credit: Number(invoice.TotalAmount) });

      const glResult = await postJournalInTx(tx, db, {
        entryDate: vDate,
        description: `Void Invoice ${ref} - ${reason}`,
        reference: `VOID-${ref}`,
        sourceModule: 'INVOICE_VOID',
        sourceId: invoiceId,
        lines,
        postedBy: session.userId,
      });
      reversingJournalEntry = glResult.entryNumber;

      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    await logAudit({
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'VOID',
      userId: session.userId,
      oldValue: { status: invoice.Status, balanceDue: invoice.BalanceDue },
      newValue: { status: 'VOID', balanceDue: 0, reason },
      description: `Invoice ${invoice.InvoiceNumber} voided: ${reason}`,
    });

    return NextResponse.json({
      status: 'SUCCESS',
      invoiceId,
      invoiceNumber: invoice.InvoiceNumber,
      invoiceStatus: 'VOID',
      reversingJournalEntry,
    });
  } catch (err) {
    return errorResponse(err, 'POST /api/v1/invoices/[invoiceId]/void');
  }
}
