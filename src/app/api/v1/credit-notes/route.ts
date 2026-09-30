import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, sql } from '@/lib/db';
import { nextDocumentNumber, postJournalInTx, toCents, type JournalLine } from '@/lib/accounting';
import { splitCreditAmount } from '@/lib/ghanaLevies';
import { validateApiAuth } from '@/lib/apiAuth';
import { ApiError, errorResponse, parseBody, withIdempotency } from '@/lib/apiErrors';
import { businessDate, parseBusinessDate } from '@/lib/dates';
import { logAudit } from '@/lib/auditLog';

const createCreditNoteSchema = z.object({
  clientId: z.number().int().positive(),
  invoiceId: z.number().int().positive().optional().nullable(),
  amount: z.number().finite().positive().max(1e12),
  reason: z.string().trim().min(3).max(500),
  creditNoteDate: businessDate.optional(),
});

export async function POST(req: NextRequest) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'finance.creditnotes.create');
  if (authError || !session) return authError!;

  return withIdempotency(req, 'creditnotes.create', session.userId, async () => {
    try {
      const input = await parseBody(req, createCreditNoteSchema);
      const amountCents = toCents(input.amount);
      if (amountCents <= 0) throw new ApiError(400, 'Credit note amount must be at least 0.01.');
      const amount = amountCents / 100;
      const cnDate = input.creditNoteDate ? parseBusinessDate(input.creditNoteDate) : new Date();
      const invoiceId = input.invoiceId ?? null;

      const db = await getDb();
      const tx = new sql.Transaction(db);
      await tx.begin();
      let creditNoteId: number;
      let creditNoteNumber: string;
      let journalEntryNumber: string;
      const cnStatus = invoiceId ? 'APPLIED' : 'OPEN';
      try {
        let split = { net: amountCents, vat: 0, nhis: 0, getfund: 0 };

        if (invoiceId) {
          const invRes = await new sql.Request(tx)
            .input('invId', invoiceId)
            .query(`
              SELECT ClientId, TotalAmount, VatAmount, NhisAmount, GetfundAmount, BalanceDue, Status
              FROM Invoices WITH (UPDLOCK, ROWLOCK)
              WHERE Id = @invId
            `);
          const invoice = invRes.recordset[0];
          if (!invoice) throw new ApiError(404, 'Invoice not found.');
          if (invoice.ClientId !== input.clientId) {
            throw new ApiError(400, 'Invoice does not belong to the specified client.');
          }
          if (invoice.Status === 'VOID') throw new ApiError(409, 'Cannot credit a voided invoice.');
          const balanceCents = toCents(Number(invoice.BalanceDue));
          if (amountCents > balanceCents) {
            throw new ApiError(
              409,
              `Credit amount (${amount}) exceeds the invoice balance due (${balanceCents / 100}).`,
              'CREDIT_EXCEEDS_BALANCE'
            );
          }
          split = splitCreditAmount(amountCents, invoice);

          const newBalance = (balanceCents - amountCents) / 100;
          await new sql.Request(tx)
            .input('invId', invoiceId)
            .input('balance', newBalance)
            .input('status', newBalance === 0 ? 'PAID' : 'PARTIAL')
            .query('UPDATE Invoices SET BalanceDue = @balance, Status = @status WHERE Id = @invId');
        } else {
          const clientRes = await new sql.Request(tx).input('clientId', input.clientId)
            .query('SELECT Id FROM Clients WHERE Id = @clientId');
          if (!clientRes.recordset.length) throw new ApiError(404, 'Client not found.');
        }

        creditNoteNumber = await nextDocumentNumber(tx, 'creditNote', 'CN', cnDate);
        const cnRes = await new sql.Request(tx)
          .input('creditNoteNumber', creditNoteNumber)
          .input('clientId', input.clientId)
          .input('invoiceId', invoiceId)
          .input('creditNoteDate', cnDate)
          .input('amount', amount)
          .input('amountApplied', invoiceId ? amount : 0)
          .input('reason', input.reason)
          .input('status', cnStatus)
          .query(`
            INSERT INTO CreditNotes
              (CreditNoteNumber, ClientId, InvoiceId, CreditNoteDate, Amount, AmountApplied, Reason, Status)
            OUTPUT INSERTED.Id
            VALUES
              (@creditNoteNumber, @clientId, @invoiceId, @creditNoteDate, @amount, @amountApplied, @reason, @status)
          `);
        creditNoteId = cnRes.recordset[0].Id;

        const lines: JournalLine[] = [
          { accountCode: '4001', description: `Credit Note Adjustment: ${creditNoteNumber}`, debit: split.net / 100 },
        ];
        if (split.vat > 0) lines.push({ accountCode: '2100', description: `VAT on ${creditNoteNumber}`, debit: split.vat / 100 });
        if (split.nhis > 0) lines.push({ accountCode: '2102', description: `NHIL on ${creditNoteNumber}`, debit: split.nhis / 100 });
        if (split.getfund > 0) lines.push({ accountCode: '2103', description: `GETFund on ${creditNoteNumber}`, debit: split.getfund / 100 });
        lines.push({ accountCode: '1100', description: `AR Credit Adjustment: ${creditNoteNumber}`, credit: amount });

        const glResult = await postJournalInTx(tx, db, {
          entryDate: cnDate,
          description: `Credit Note ${creditNoteNumber} - ${input.reason}`,
          reference: creditNoteNumber,
          sourceModule: 'CREDIT_NOTE',
          sourceId: creditNoteId,
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
        entityType: 'CREDIT_NOTE',
        entityId: creditNoteId,
        action: 'POST',
        userId: session.userId,
        newValue: { creditNoteNumber, clientId: input.clientId, invoiceId, amount, reason: input.reason, status: cnStatus },
        description: `Credit note ${creditNoteNumber} issued for client ID ${input.clientId}, amount ${amount}`,
      });

      return NextResponse.json(
        { status: 'SUCCESS', creditNoteId, creditNoteNumber, amount, cnStatus, journalEntryNumber },
        { status: 201 }
      );
    } catch (err) {
      return errorResponse(err, 'POST /api/v1/credit-notes');
    }
  });
}
