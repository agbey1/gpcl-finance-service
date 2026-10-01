import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, sql } from '@/lib/db';
import { validateApiAuth } from '@/lib/apiAuth';
import { ApiError, errorResponse, parseBody } from '@/lib/apiErrors';
import { postJournalInTx, toCents, type JournalLine } from '@/lib/accounting';
import { logAudit } from '@/lib/auditLog';

const bodySchema = z.object({
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters.').max(400),
});

/**
 * Reverses a customer payment: posts the mirror image of its ledger entry
 * (dated today), restores the invoice balance it settled, voids any
 * overpayment credit note it created, and marks the payment REVERSED.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'finance.payments.reverse');
  if (authError) return authError;

  try {
    const paymentId = parseInt((await params).paymentId, 10);
    if (!Number.isInteger(paymentId) || paymentId <= 0) throw new ApiError(400, 'Invalid payment ID');
    const { reason } = await parseBody(req, bodySchema);

    const db = await getDb();
    const tx = new sql.Transaction(db);
    await tx.begin();
    let paymentNumber: string;
    let reversalEntryNumber: string;
    let restored = 0;
    let voidedCreditNote: string | null = null;
    try {
      const payRes = await new sql.Request(tx).input('id', paymentId).query(`
        SELECT Id, PaymentNumber, ClientId, InvoiceId, PaymentDate, Amount, ISNULL(Status, 'POSTED') AS Status, OverpaymentCreditNoteId
        FROM Payments WITH (UPDLOCK, HOLDLOCK) WHERE Id = @id
      `);
      const payment = payRes.recordset[0];
      if (!payment) throw new ApiError(404, 'Payment not found.');
      if (payment.Status === 'REVERSED') throw new ApiError(409, `Payment ${payment.PaymentNumber} has already been reversed.`);
      paymentNumber = payment.PaymentNumber;

      const jRes = await new sql.Request(tx).input('sid', String(paymentId)).query(`
        SELECT TOP 1 Id, EntryNumber FROM JournalEntries WITH (UPDLOCK, HOLDLOCK)
        WHERE SourceModule = 'PAYMENT' AND SourceId = @sid AND ReversalOfId IS NULL ORDER BY Id
      `);
      const journal = jRes.recordset[0];
      if (!journal) throw new ApiError(409, `The ledger entry for ${paymentNumber} could not be found. Contact your administrator.`);
      const already = await new sql.Request(tx).input('jid', journal.Id)
        .query('SELECT TOP 1 EntryNumber FROM JournalEntries WHERE ReversalOfId = @jid');
      if (already.recordset.length) throw new ApiError(409, `${journal.EntryNumber} is already reversed by ${already.recordset[0].EntryNumber}.`);

      const lineRes = await new sql.Request(tx).input('jid', journal.Id).query(`
        SELECT a.Code AS AccountCode, l.Debit, l.Credit
        FROM JournalEntryLines l INNER JOIN Accounts a ON a.Id = l.AccountId
        WHERE l.JournalEntryId = @jid ORDER BY l.Id
      `);

      // Overpayment credit note created with this payment (column set since migration 013;
      // older payments fall back to the open overpayment credit on the same invoice and date).
      let cn: { Id: number; CreditNoteNumber: string; Amount: number; AmountApplied: number; Status: string } | undefined;
      if (payment.OverpaymentCreditNoteId) {
        const r = await new sql.Request(tx).input('id', payment.OverpaymentCreditNoteId).query(
          'SELECT Id, CreditNoteNumber, Amount, ISNULL(AmountApplied, 0) AS AmountApplied, Status FROM CreditNotes WITH (UPDLOCK) WHERE Id = @id'
        );
        cn = r.recordset[0];
      } else if (payment.InvoiceId) {
        const r = await new sql.Request(tx)
          .input('inv', payment.InvoiceId)
          .input('client', payment.ClientId)
          .input('d', payment.PaymentDate)
          .query(`
            SELECT TOP 1 Id, CreditNoteNumber, Amount, ISNULL(AmountApplied, 0) AS AmountApplied, Status
            FROM CreditNotes WITH (UPDLOCK)
            WHERE InvoiceId = @inv AND ClientId = @client AND CreditNoteNumber LIKE 'CN-OVERPAY-%'
              AND Status = 'OPEN' AND CAST(CreditNoteDate AS date) = CAST(@d AS date)
            ORDER BY Id DESC
          `);
        cn = r.recordset[0];
      }
      if (cn && toCents(Number(cn.AmountApplied)) > 0) {
        throw new ApiError(409, `The overpayment credit ${cn.CreditNoteNumber} from this payment has already been used, so the payment cannot be reversed.`);
      }
      // The excess never reached the invoice, whatever the credit note's status is now.
      const excessCents = cn ? toCents(Number(cn.Amount)) : 0;
      const appliedCents = toCents(Number(payment.Amount)) - excessCents;

      if (payment.InvoiceId && appliedCents > 0) {
        const invRes = await new sql.Request(tx).input('id', payment.InvoiceId)
          .query('SELECT Id, InvoiceNumber, TotalAmount, BalanceDue, Status FROM Invoices WITH (UPDLOCK) WHERE Id = @id');
        const inv = invRes.recordset[0];
        if (!inv) throw new ApiError(409, 'The invoice this payment was applied to no longer exists.');
        if (inv.Status === 'VOID') throw new ApiError(409, `Invoice ${inv.InvoiceNumber} is void; the payment cannot be reversed against it.`);
        const newBalanceCents = toCents(Number(inv.BalanceDue)) + appliedCents;
        if (newBalanceCents > toCents(Number(inv.TotalAmount))) {
          throw new ApiError(409, `Reversing would raise ${inv.InvoiceNumber} above its total. Contact your administrator.`);
        }
        await new sql.Request(tx)
          .input('id', inv.Id)
          .input('bal', newBalanceCents / 100)
          .input('status', newBalanceCents === toCents(Number(inv.TotalAmount)) ? 'UNPAID' : 'PARTIAL')
          .query('UPDATE Invoices SET BalanceDue = @bal, Status = @status WHERE Id = @id');
        restored = appliedCents / 100;
      }

      if (cn && cn.Status === 'OPEN') {
        await new sql.Request(tx).input('id', cn.Id).query(`UPDATE CreditNotes SET Status = 'VOID' WHERE Id = @id`);
        voidedCreditNote = cn.CreditNoteNumber;
      }

      const lines: JournalLine[] = lineRes.recordset.map((l: { AccountCode: string; Debit: number; Credit: number }) => ({
        accountCode: l.AccountCode,
        description: `Reversal of ${paymentNumber}`,
        ...(Number(l.Debit) > 0 ? { credit: Number(l.Debit) } : { debit: Number(l.Credit) }),
      }));
      const posted = await postJournalInTx(tx, db, {
        entryDate: new Date(),
        description: `Reversal of payment ${paymentNumber} - ${reason}`,
        reference: paymentNumber,
        sourceModule: 'PAYMENT_REVERSAL',
        sourceId: paymentId,
        reversalOfId: journal.Id,
        lines,
        postedBy: session!.userId,
      });
      reversalEntryNumber = posted.entryNumber;

      await new sql.Request(tx)
        .input('id', paymentId)
        .input('by', session!.userId)
        .input('reason', reason)
        .query(`UPDATE Payments SET Status = 'REVERSED', ReversedAt = SYSUTCDATETIME(), ReversedBy = @by, ReversalReason = @reason WHERE Id = @id`);
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    await logAudit({
      entityType: 'PAYMENT',
      entityId: paymentId,
      action: 'VOID',
      userId: session!.userId,
      oldValue: { status: 'POSTED' },
      newValue: { status: 'REVERSED', reason, reversalEntryNumber, invoiceBalanceRestored: restored, voidedCreditNote },
      description: `Payment ${paymentNumber} reversed by ${reversalEntryNumber}: ${reason}`,
    });

    return NextResponse.json({ status: 'SUCCESS', paymentNumber, reversalEntryNumber, invoiceBalanceRestored: restored, voidedCreditNote });
  } catch (err) {
    return errorResponse(err, '/api/v1/payments/[paymentId]/reverse');
  }
}
