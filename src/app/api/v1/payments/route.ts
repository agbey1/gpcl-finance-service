import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { postJournalInTx, type JournalLine, ClosedPeriodError } from '@/lib/accounting';
import { getIdempotentResponse, saveIdempotentResponse } from '@/lib/idempotency';
import { validateApiAuth } from '@/lib/apiAuth';
import { logAudit } from '@/lib/auditLog';

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization & Permission check
    const { session, errorResponse } = validateApiAuth(req, 'finance.payments.create');
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
    const { clientId, paymentDate, amount, paymentMethod, reference, bankAccountId, invoiceId, postedBy } = body;

    if (!clientId || !amount || amount <= 0 || !paymentMethod) {
      return NextResponse.json(
        { status: 'ERROR', message: 'clientId, amount > 0, and paymentMethod are required.' },
        { status: 400 }
      );
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();
    const db = await getDb();
    const tx = new sql.Transaction(db);
    await tx.begin();

    try {
      let overpaymentCreditNoteId: number | null = null;
      let excessCreditAmount = 0;

      // 3. Invoice Concurrency & Status Validation with Row Lock
      if (invoiceId) {
        const invRes = await new sql.Request(tx)
          .input('invId', invoiceId)
          .query(`
            SELECT Id, InvoiceNumber, TotalAmount, BalanceDue, Status
            FROM Invoices WITH (UPDLOCK)
            WHERE Id = @invId
          `);

        if (!invRes.recordset.length) {
          await tx.rollback();
          return NextResponse.json({ status: 'ERROR', message: 'Invoice not found' }, { status: 404 });
        }

        const invoice = invRes.recordset[0];

        if (invoice.Status === 'PAID') {
          await tx.rollback();
          return NextResponse.json(
            { status: 'ERROR', message: 'Invoice is already fully paid. Cannot apply additional payments.' },
            { status: 409 }
          );
        }

        if (invoice.Status === 'VOID') {
          await tx.rollback();
          return NextResponse.json(
            { status: 'ERROR', message: 'Invoice is voided. Cannot process payment on voided invoices.' },
            { status: 409 }
          );
        }

        const balanceDue = Number(invoice.BalanceDue);
        if (amount > balanceDue) {
          excessCreditAmount = amount - balanceDue;

          // Automatically record excess payment as an OPEN Credit Note
          const cnCntRes = await new sql.Request(tx).query("SELECT COUNT(*) AS cnt FROM CreditNotes");
          const seq = String((cnCntRes.recordset[0]?.cnt || 0) + 1).padStart(6, '0');
          const year = new Date().getFullYear();
          const creditNoteNumber = `CN-OVERPAY-${year}-${seq}`;

          const cnRes = await new sql.Request(tx)
            .input('creditNoteNumber', creditNoteNumber)
            .input('clientId', clientId)
            .input('invoiceId', invoiceId)
            .input('creditNoteDate', payDate)
            .input('amount', excessCreditAmount)
            .input('amountApplied', 0)
            .input('reason', `Overpayment credit on invoice ${invoice.InvoiceNumber}`)
            .input('status', 'OPEN')
            .query(`
              INSERT INTO CreditNotes
                (CreditNoteNumber, ClientId, InvoiceId, CreditNoteDate, Amount, AmountApplied, Reason, Status)
              OUTPUT INSERTED.Id
              VALUES
                (@creditNoteNumber, @clientId, @invoiceId, @creditNoteDate, @amount, @amountApplied, @reason, @status)
            `);
          overpaymentCreditNoteId = cnRes.recordset[0].Id;
        }

        // Update Invoice Balance & Status
        await new sql.Request(tx)
          .input('invId', invoiceId)
          .input('amt', amount)
          .query(`
            UPDATE Invoices
            SET BalanceDue = CASE WHEN BalanceDue - @amt < 0 THEN 0 ELSE BalanceDue - @amt END,
                Status = CASE WHEN BalanceDue - @amt <= 0 THEN 'PAID' ELSE 'PARTIAL' END
            WHERE Id = @invId
          `);
      }

      // 4. Generate Next Payment Number
      const cntRes = await new sql.Request(tx).query("SELECT COUNT(*) AS cnt FROM Payments");
      const seq = String((cntRes.recordset[0]?.cnt || 0) + 1).padStart(6, '0');
      const year = new Date().getFullYear();
      const paymentNumber = `PAY-${year}-${seq}`;

      // 5. Insert Payment Record
      const payRes = await new sql.Request(tx)
        .input('paymentNumber', paymentNumber)
        .input('clientId', clientId)
        .input('paymentDate', payDate)
        .input('amount', amount)
        .input('paymentMethod', paymentMethod)
        .input('reference', reference ?? null)
        .input('bankAccountId', bankAccountId ?? null)
        .query(`
          INSERT INTO Payments
            (PaymentNumber, ClientId, PaymentDate, Amount, PaymentMethod, Reference, BankAccountId)
          OUTPUT INSERTED.Id
          VALUES
            (@paymentNumber, @clientId, @paymentDate, @amount, @paymentMethod, @reference, @bankAccountId)
        `);

      const paymentId = payRes.recordset[0].Id;

      // 6. Post GL Entry (Debit Cash/Bank, Credit Trade Receivables 1100)
      const assetAccountCode = (paymentMethod === 'BANK_TRANSFER' || bankAccountId) ? '1002' : '1001';
      const lines: JournalLine[] = [
        { accountCode: assetAccountCode, description: `Payment Received: ${paymentNumber}`, debit: amount },
        { accountCode: '1100', description: `AR Settlement: ${paymentNumber}`, credit: amount },
      ];

      const glResult = await postJournalInTx(tx, db, {
        entryDate: payDate,
        description: `Customer Payment ${paymentNumber}`,
        reference: reference || paymentNumber,
        sourceModule: 'PAYMENT',
        sourceId: paymentId,
        lines,
        postedBy: session?.userId || postedBy || 1,
      });

      await tx.commit();

      // Log audit trail
      await logAudit({
        entityType: 'PAYMENT',
        entityId: paymentId,
        action: 'POST',
        userId: session?.userId || 1,
        newValue: {
          paymentNumber,
          clientId,
          invoiceId: invoiceId || null,
          paymentDate: payDate.toISOString(),
          amount,
          paymentMethod,
          reference: reference || null,
        },
        description: `Payment ${paymentNumber} recorded for client ID ${clientId}, amount ${amount}`,
      });

      const successPayload = {
        status: 'SUCCESS',
        paymentId,
        paymentNumber,
        amount,
        excessCreditAmount: excessCreditAmount > 0 ? excessCreditAmount : 0,
        overpaymentCreditNoteId,
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
