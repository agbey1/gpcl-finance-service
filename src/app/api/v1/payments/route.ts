import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, sql } from '@/lib/db';
import { nextDocumentNumber, postJournalInTx, toCents, type JournalLine } from '@/lib/accounting';
import { validateApiAuth } from '@/lib/apiAuth';
import { ApiError, errorResponse, parseBody, withIdempotency } from '@/lib/apiErrors';
import { businessDate, parseBusinessDate } from '@/lib/dates';
import { logAudit } from '@/lib/auditLog';
import { getAccountMap } from '@/lib/accountMap';

const PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH', 'CHEQUE', 'MOBILE_MONEY'] as const;

const createPaymentSchema = z.object({
  clientId: z.number().int().positive(),
  invoiceId: z.number().int().positive().optional().nullable(),
  amount: z.number().finite().positive().max(1e12),
  paymentMethod: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(100).optional().nullable(),
  bankAccountId: z.number().int().positive().optional().nullable(),
  paymentDate: businessDate.optional(),
});

export async function POST(req: NextRequest) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'finance.payments.create');
  if (authError || !session) return authError!;

  return withIdempotency(req, 'payments.create', session.userId, async () => {
    try {
      const input = await parseBody(req, createPaymentSchema);
      const amountCents = toCents(input.amount);
      if (amountCents <= 0) throw new ApiError(400, 'Payment amount must be at least 0.01.');
      const amount = amountCents / 100;
      const payDate = input.paymentDate ? parseBusinessDate(input.paymentDate) : new Date();
      const invoiceId = input.invoiceId ?? null;

      const db = await getDb();
      const clientRes = await db.request().input('clientId', input.clientId)
        .query('SELECT Id FROM Clients WHERE Id = @clientId');
      if (!clientRes.recordset.length) throw new ApiError(404, 'Client not found.');

      const gl = await getAccountMap(db);
      const tx = new sql.Transaction(db);
      await tx.begin();
      let paymentId: number;
      let paymentNumber: string;
      let journalEntryNumber: string;
      let excessCreditAmount = 0;
      let overpaymentCreditNoteId: number | null = null;
      try {
        if (invoiceId) {
          const invRes = await new sql.Request(tx)
            .input('invId', invoiceId)
            .query(`
              SELECT Id, InvoiceNumber, ClientId, BalanceDue, Status
              FROM Invoices WITH (UPDLOCK, ROWLOCK)
              WHERE Id = @invId
            `);
          const invoice = invRes.recordset[0];
          if (!invoice) throw new ApiError(404, 'Invoice not found.');
          if (invoice.ClientId !== input.clientId) {
            throw new ApiError(400, 'Invoice does not belong to the specified client.');
          }
          if (invoice.Status === 'VOID') {
            throw new ApiError(409, 'Invoice is voided. Cannot process payment on voided invoices.');
          }
          const balanceCents = toCents(Number(invoice.BalanceDue));
          if (invoice.Status === 'PAID' || balanceCents <= 0) {
            throw new ApiError(409, 'Invoice is already fully paid. Cannot apply additional payments.');
          }

          if (amountCents > balanceCents) {
            // Record the excess as an open credit note for the client.
            excessCreditAmount = (amountCents - balanceCents) / 100;
            const creditNoteNumber = await nextDocumentNumber(tx, 'creditNote', 'CN-OVERPAY', payDate);
            const cnRes = await new sql.Request(tx)
              .input('creditNoteNumber', creditNoteNumber)
              .input('clientId', input.clientId)
              .input('invoiceId', invoiceId)
              .input('creditNoteDate', payDate)
              .input('amount', excessCreditAmount)
              .input('reason', `Overpayment credit on invoice ${invoice.InvoiceNumber}`)
              .query(`
                INSERT INTO CreditNotes
                  (CreditNoteNumber, ClientId, InvoiceId, CreditNoteDate, Amount, AmountApplied, Reason, Status)
                OUTPUT INSERTED.Id
                VALUES
                  (@creditNoteNumber, @clientId, @invoiceId, @creditNoteDate, @amount, 0, @reason, 'OPEN')
              `);
            overpaymentCreditNoteId = cnRes.recordset[0].Id;
          }

          const newBalance = Math.max(0, balanceCents - amountCents) / 100;
          await new sql.Request(tx)
            .input('invId', invoiceId)
            .input('balance', newBalance)
            .input('status', newBalance === 0 ? 'PAID' : 'PARTIAL')
            .query('UPDATE Invoices SET BalanceDue = @balance, Status = @status WHERE Id = @invId');
        }

        paymentNumber = await nextDocumentNumber(tx, 'payment', 'PAY', payDate);
        const payRes = await new sql.Request(tx)
          .input('paymentNumber', paymentNumber)
          .input('clientId', input.clientId)
          .input('invoiceId', invoiceId)
          .input('paymentDate', payDate)
          .input('amount', amount)
          .input('paymentMethod', input.paymentMethod)
          .input('reference', input.reference || null)
          .input('bankAccountId', input.bankAccountId ?? null)
          .input('recordedBy', session.userId)
          .input('overpaymentCreditNoteId', overpaymentCreditNoteId)
          .query(`
            INSERT INTO Payments
              (PaymentNumber, ClientId, InvoiceId, PaymentDate, Amount, PaymentMethod, Reference, BankAccountId, RecordedBy, OverpaymentCreditNoteId)
            OUTPUT INSERTED.Id
            VALUES
              (@paymentNumber, @clientId, @invoiceId, @paymentDate, @amount, @paymentMethod, @reference, @bankAccountId, @recordedBy, @overpaymentCreditNoteId)
          `);
        paymentId = payRes.recordset[0].Id;

        // Debit the mapped bank account for transfers or banked receipts, otherwise cash;
        // credit trade receivables. Any overpayment leaves a credit balance
        // on AR matching the open credit note.
        const assetAccountCode = input.paymentMethod === 'BANK_TRANSFER' || input.bankAccountId ? gl.bank : gl.cash;
        const lines: JournalLine[] = [
          { accountCode: assetAccountCode, description: `Payment Received: ${paymentNumber}`, debit: amount },
          { accountCode: gl.receivables, description: `AR Settlement: ${paymentNumber}`, credit: amount },
        ];
        const glResult = await postJournalInTx(tx, db, {
          entryDate: payDate,
          description: `Customer Payment ${paymentNumber}`,
          reference: input.reference || paymentNumber,
          sourceModule: 'PAYMENT',
          sourceId: paymentId,
          lines,
          postedBy: session.userId,
        });
        journalEntryNumber = glResult.entryNumber;

        await tx.commit();
      } catch (err) {
        await tx.rollback().catch(() => {});
        throw err;
      }

      await logAudit({
        entityType: 'PAYMENT',
        entityId: paymentId,
        action: 'POST',
        userId: session.userId,
        newValue: {
          paymentNumber,
          clientId: input.clientId,
          invoiceId,
          paymentDate: payDate.toISOString(),
          amount,
          paymentMethod: input.paymentMethod,
          reference: input.reference || null,
        },
        description: `Payment ${paymentNumber} recorded for client ID ${input.clientId}, amount ${amount}`,
      });

      return NextResponse.json(
        {
          status: 'SUCCESS',
          paymentId,
          paymentNumber,
          amount,
          excessCreditAmount,
          overpaymentCreditNoteId,
          journalEntryNumber,
        },
        { status: 201 }
      );
    } catch (err) {
      return errorResponse(err, 'POST /api/v1/payments');
    }
  });
}
