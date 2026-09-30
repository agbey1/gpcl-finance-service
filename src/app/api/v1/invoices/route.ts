import { NextRequest, NextResponse } from 'next/server';
import { getDb, sql } from '@/lib/db';
import { computeLevies } from '@/lib/ghanaLevies';
import { postJournalInTx, type JournalLine, ClosedPeriodError } from '@/lib/accounting';
import { getIdempotentResponse, saveIdempotentResponse } from '@/lib/idempotency';
import { validateApiAuth } from '@/lib/apiAuth';
import { logAudit } from '@/lib/auditLog';
import { computeCreditExposure } from '@/lib/creditLimit';

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization & Permission check
    const { session, errorResponse } = validateApiAuth(req, 'finance.invoices.create');
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
    const { clientId, invoiceDate, dueDate, postedBy, lineItems, applyGhanaLevies = true, enforceCreditLimit = false } = body;

    if (!clientId || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'clientId and at least one lineItem are required.' },
        { status: 400 }
      );
    }

    const subTotal = lineItems.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0);
    const levies = applyGhanaLevies ? computeLevies(subTotal) : { net: subTotal, vat: 0, nhis: 0, getfund: 0, gross: subTotal };

    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const due = dueDate ? new Date(dueDate) : new Date(invDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (due < invDate) {
      return NextResponse.json(
        { status: 'ERROR', message: 'dueDate cannot be earlier than invoiceDate.' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 3. Optional Credit Limit Exposure Enforcement
    if (enforceCreditLimit) {
      const exposure = await computeCreditExposure(db, clientId);
      if (exposure.creditLimit != null && exposure.available < levies.gross) {
        return NextResponse.json(
          {
            status: 'ERROR',
            code: 'CREDIT_LIMIT_EXCEEDED',
            message: `Invoice gross amount (${levies.gross}) exceeds client available credit limit (${exposure.available}).`,
            creditLimit: exposure.creditLimit,
            netExposure: exposure.netExposure,
            availableCredit: exposure.available,
          },
          { status: 403 }
        );
      }
    }


    const tx = new sql.Transaction(db);
    await tx.begin();

    try {
      // 1. Generate Next Invoice Number
      const cntRes = await new sql.Request(tx).query("SELECT COUNT(*) AS cnt FROM Invoices");
      const seq = String((cntRes.recordset[0]?.cnt || 0) + 1).padStart(6, '0');
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${seq}`;

      // 2. Insert Invoice Record
      const invRes = await new sql.Request(tx)
        .input('invoiceNumber', invoiceNumber)
        .input('clientId', clientId)
        .input('invoiceDate', invDate)
        .input('dueDate', due)
        .input('subTotal', levies.net)
        .input('vatAmount', levies.vat)
        .input('nhisAmount', levies.nhis)
        .input('getfundAmount', levies.getfund)
        .input('totalAmount', levies.gross)
        .input('balanceDue', levies.gross)
        .query(`
          INSERT INTO Invoices
            (InvoiceNumber, ClientId, InvoiceDate, DueDate, SubTotal, VatAmount, NhisAmount, GetfundAmount, TotalAmount, BalanceDue, Status)
          OUTPUT INSERTED.Id
          VALUES
            (@invoiceNumber, @clientId, @invoiceDate, @dueDate, @subTotal, @vatAmount, @nhisAmount, @getfundAmount, @totalAmount, @balanceDue, 'UNPAID')
        `);

      const invoiceId = invRes.recordset[0].Id;

      // 3. Post General Ledger Entry
      const lines: JournalLine[] = [
        { accountCode: '1100', description: `Trade Receivables: ${invoiceNumber}`, debit: levies.gross },
        { accountCode: '4001', description: `Sales Revenue: ${invoiceNumber}`, credit: levies.net },
      ];

      if (levies.vat > 0) lines.push({ accountCode: '2100', description: `VAT (15%) on ${invoiceNumber}`, credit: levies.vat });
      if (levies.nhis > 0) lines.push({ accountCode: '2102', description: `NHIS (2.5%) on ${invoiceNumber}`, credit: levies.nhis });
      if (levies.getfund > 0) lines.push({ accountCode: '2103', description: `GETFund (2.5%) on ${invoiceNumber}`, credit: levies.getfund });

      const glResult = await postJournalInTx(tx, db, {
        entryDate: invDate,
        description: `Customer Invoice ${invoiceNumber}`,
        reference: invoiceNumber,
        sourceModule: 'INVOICE',
        sourceId: invoiceId,
        lines,
        postedBy: session?.userId || postedBy || 1,
      });

      await tx.commit();

      // Log audit trail
      await logAudit({
        entityType: 'INVOICE',
        entityId: invoiceId,
        action: 'POST',
        userId: session?.userId || 1,
        newValue: {
          invoiceNumber,
          clientId,
          invoiceDate: invDate.toISOString(),
          dueDate: due.toISOString(),
          subTotal: levies.net,
          vatAmount: levies.vat,
          nhisAmount: levies.nhis,
          getfundAmount: levies.getfund,
          totalAmount: levies.gross,
          status: 'UNPAID',
        },
        description: `Invoice ${invoiceNumber} posted for client ID ${clientId}`,
      });

      const successPayload = {
        status: 'SUCCESS',
        invoiceId,
        invoiceNumber,
        subTotal: levies.net,
        vatAmount: levies.vat,
        nhisAmount: levies.nhis,
        getfundAmount: levies.getfund,
        totalAmount: levies.gross,
        balanceDue: levies.gross,
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
