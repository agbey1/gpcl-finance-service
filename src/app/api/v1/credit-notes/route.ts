import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { postJournalInTx, type JournalLine, ClosedPeriodError } from '@/lib/accounting';
import { getIdempotentResponse, saveIdempotentResponse } from '@/lib/idempotency';
import { validateApiAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization & Permission check
    const { session, errorResponse } = validateApiAuth(req, 'finance.creditnotes.create');
    if (errorResponse) return errorResponse;

    // 2. Idempotency Key validation
    const idempotencyKey =
      req.headers.get('idempotency-key') ||
      req.headers.get('x-idempotency-key');

    if (idempotencyKey) {
      const cached = getIdempotentResponse(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached.responseBody, { status: cached.responseStatus });
      }
    }

    const body = await req.json();
    const { clientId, invoiceId, amount, reason, creditNoteDate, postedBy } = body;

    if (!clientId || !amount || amount <= 0 || !reason) {
      return NextResponse.json(
        { status: 'ERROR', message: 'clientId, amount > 0, and reason are required.' },
        { status: 400 }
      );
    }

    const cnDate = creditNoteDate ? new Date(creditNoteDate) : new Date();
    const db = await getDb();
    const tx = new sql.Transaction(db);
    await tx.begin();

    try {
      // 1. Generate Credit Note Number
      const cntRes = await new sql.Request(tx).query("SELECT COUNT(*) AS cnt FROM CreditNotes");
      const seq = String((cntRes.recordset[0]?.cnt || 0) + 1).padStart(6, '0');
      const year = new Date().getFullYear();
      const creditNoteNumber = `CN-${year}-${seq}`;

      const isApplied = !!invoiceId;
      const amountApplied = isApplied ? amount : 0;
      const cnStatus = isApplied ? 'APPLIED' : 'OPEN';

      // 2. Insert Credit Note Record
      const cnRes = await new sql.Request(tx)
        .input('creditNoteNumber', creditNoteNumber)
        .input('clientId', clientId)
        .input('invoiceId', invoiceId ?? null)
        .input('creditNoteDate', cnDate)
        .input('amount', amount)
        .input('amountApplied', amountApplied)
        .input('reason', reason)
        .input('status', cnStatus)
        .query(`
          INSERT INTO CreditNotes
            (CreditNoteNumber, ClientId, InvoiceId, CreditNoteDate, Amount, AmountApplied, Reason, Status)
          OUTPUT INSERTED.Id
          VALUES
            (@creditNoteNumber, @clientId, @invoiceId, @creditNoteDate, @amount, @amountApplied, @reason, @status)
        `);

      const creditNoteId = cnRes.recordset[0].Id;

      // 3. If tied to an invoice, reduce invoice balance due with row locking
      if (invoiceId) {
        await new sql.Request(tx)
          .input('invId', invoiceId)
          .input('amt', amount)
          .query(`
            UPDATE Invoices WITH (UPDLOCK)
            SET BalanceDue = CASE WHEN BalanceDue - @amt < 0 THEN 0 ELSE BalanceDue - @amt END,
                Status = CASE WHEN BalanceDue - @amt <= 0 THEN 'PAID' ELSE 'PARTIAL' END
            WHERE Id = @invId
          `);
      }

      // 4. Post Reversing GL Entry (Debit Revenue 4001, Credit AR 1100)
      const lines: JournalLine[] = [
        { accountCode: '4001', description: `Credit Note Adjustment: ${creditNoteNumber}`, debit: amount },
        { accountCode: '1100', description: `AR Credit Adjustment: ${creditNoteNumber}`, credit: amount },
      ];

      const glResult = await postJournalInTx(tx, db, {
        entryDate: cnDate,
        description: `Credit Note ${creditNoteNumber} - ${reason}`,
        reference: creditNoteNumber,
        sourceModule: 'CREDIT_NOTE',
        sourceId: creditNoteId,
        lines,
        postedBy: session?.userId || postedBy || 1,
      });

      await tx.commit();

      const successPayload = {
        status: 'SUCCESS',
        creditNoteId,
        creditNoteNumber,
        amount,
        cnStatus,
        journalEntryNumber: glResult.entryNumber,
      };

      if (idempotencyKey) {
        saveIdempotentResponse(idempotencyKey, 201, successPayload);
      }

      return NextResponse.json(successPayload, { status: 201 });
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
