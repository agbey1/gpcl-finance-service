import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, sql } from '@/lib/db';
import { computeLevies } from '@/lib/ghanaLevies';
import { nextDocumentNumber, postJournalInTx, toCents, type JournalLine } from '@/lib/accounting';
import { validateApiAuth } from '@/lib/apiAuth';
import { ApiError, errorResponse, parseBody, withIdempotency } from '@/lib/apiErrors';
import { parseBusinessDate, businessDate } from '@/lib/dates';
import { logAudit } from '@/lib/auditLog';
import { computeCreditExposure } from '@/lib/creditLimit';
import { getAccountMap } from '@/lib/accountMap';

const money = z.number().finite().max(1e12);

const createInvoiceSchema = z.object({
  clientId: z.number().int().positive(),
  invoiceDate: businessDate.optional(),
  dueDate: businessDate.optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(500),
        quantity: z.number().finite().positive().max(1e9),
        unitPrice: money.nonnegative(),
      })
    )
    .min(1, 'At least one line item is required.')
    .max(200),
  applyGhanaLevies: z.boolean().default(true),
  enforceCreditLimit: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const { session, errorResponse: authError } = validateApiAuth(req, 'finance.invoices.create');
  if (authError || !session) return authError!;

  return withIdempotency(req, 'invoices.create', session.userId, async () => {
    try {
      const input = await parseBody(req, createInvoiceSchema);

      const subTotalCents = input.lineItems.reduce(
        (acc, item) => acc + toCents(item.quantity * item.unitPrice),
        0
      );
      if (subTotalCents <= 0) throw new ApiError(400, 'Invoice total must be greater than zero.');
      const subTotal = subTotalCents / 100;
      const levies = input.applyGhanaLevies
        ? computeLevies(subTotal)
        : { net: subTotal, vat: 0, nhis: 0, getfund: 0, gross: subTotal };

      const invDate = input.invoiceDate ? parseBusinessDate(input.invoiceDate) : new Date();
      const due = input.dueDate
        ? parseBusinessDate(input.dueDate)
        : new Date(invDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (due < invDate) throw new ApiError(400, 'dueDate cannot be earlier than invoiceDate.');

      const db = await getDb();

      const clientRes = await db.request().input('clientId', input.clientId)
        .query('SELECT Id, Name FROM Clients WHERE Id = @clientId');
      const client = clientRes.recordset[0];
      if (!client) throw new ApiError(404, 'Client not found.');

      if (input.enforceCreditLimit) {
        const exposure = await computeCreditExposure(db, input.clientId);
        if (exposure.creditLimit != null && exposure.available < levies.gross) {
          throw new ApiError(
            403,
            `Invoice gross amount (${levies.gross}) exceeds client available credit limit (${exposure.available}).`,
            'CREDIT_LIMIT_EXCEEDED',
            { creditLimit: exposure.creditLimit, netExposure: exposure.netExposure, availableCredit: exposure.available }
          );
        }
      }

      const gl = await getAccountMap(db);
      const tx = new sql.Transaction(db);
      await tx.begin();
      let invoiceId: number;
      let invoiceNumber: string;
      let journalEntryNumber: string;
      try {
        invoiceNumber = await nextDocumentNumber(tx, 'invoice', 'INV', invDate);

        const invRes = await new sql.Request(tx)
          .input('invoiceNumber', invoiceNumber)
          .input('clientId', input.clientId)
          .input('clientName', client.Name)
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
              (InvoiceNumber, ClientId, ClientName, InvoiceDate, DueDate, SubTotal, VatAmount, NhisAmount, GetfundAmount, TotalAmount, BalanceDue, Status)
            OUTPUT INSERTED.Id
            VALUES
              (@invoiceNumber, @clientId, @clientName, @invoiceDate, @dueDate, @subTotal, @vatAmount, @nhisAmount, @getfundAmount, @totalAmount, @balanceDue, 'UNPAID')
          `);
        invoiceId = invRes.recordset[0].Id;

        for (const [i, item] of input.lineItems.entries()) {
          await new sql.Request(tx)
            .input('invoiceId', invoiceId)
            .input('lineNumber', i + 1)
            .input('description', item.description)
            .input('quantity', item.quantity)
            .input('unitPrice', item.unitPrice)
            .input('lineTotal', toCents(item.quantity * item.unitPrice) / 100)
            .query(`
              INSERT INTO InvoiceLines (InvoiceId, LineNumber, Description, Quantity, UnitPrice, LineTotal)
              VALUES (@invoiceId, @lineNumber, @description, @quantity, @unitPrice, @lineTotal)
            `);
        }

        const lines: JournalLine[] = [
          { accountCode: gl.receivables, description: `Trade Receivables: ${invoiceNumber}`, debit: levies.gross },
          { accountCode: gl.revenue, description: `Sales Revenue: ${invoiceNumber}`, credit: levies.net },
        ];
        if (levies.vat > 0) lines.push({ accountCode: gl.vat, description: `VAT on ${invoiceNumber}`, credit: levies.vat });
        if (levies.nhis > 0) lines.push({ accountCode: gl.nhil, description: `NHIL on ${invoiceNumber}`, credit: levies.nhis });
        if (levies.getfund > 0) lines.push({ accountCode: gl.getfund, description: `GETFund on ${invoiceNumber}`, credit: levies.getfund });

        const glResult = await postJournalInTx(tx, db, {
          entryDate: invDate,
          description: `Customer Invoice ${invoiceNumber}`,
          reference: invoiceNumber,
          sourceModule: 'INVOICE',
          sourceId: invoiceId,
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
        entityType: 'INVOICE',
        entityId: invoiceId,
        action: 'POST',
        userId: session.userId,
        newValue: {
          invoiceNumber,
          clientId: input.clientId,
          invoiceDate: invDate.toISOString(),
          dueDate: due.toISOString(),
          lineItems: input.lineItems,
          subTotal: levies.net,
          vatAmount: levies.vat,
          nhisAmount: levies.nhis,
          getfundAmount: levies.getfund,
          totalAmount: levies.gross,
          status: 'UNPAID',
        },
        description: `Invoice ${invoiceNumber} posted for client ID ${input.clientId}`,
      });

      return NextResponse.json(
        {
          status: 'SUCCESS',
          invoiceId,
          invoiceNumber,
          subTotal: levies.net,
          vatAmount: levies.vat,
          nhisAmount: levies.nhis,
          getfundAmount: levies.getfund,
          totalAmount: levies.gross,
          balanceDue: levies.gross,
          journalEntryNumber,
        },
        { status: 201 }
      );
    } catch (err) {
      return errorResponse(err, 'POST /api/v1/invoices');
    }
  });
}
