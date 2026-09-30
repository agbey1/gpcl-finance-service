import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'accounting.journal.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const accountCode = url.searchParams.get('accountCode');
    const sourceModule = url.searchParams.get('sourceModule');
    const entryNumber = url.searchParams.get('entryNumber');
    const skip = parseInt(url.searchParams.get('skip') || '0', 10);
    const take = parseInt(url.searchParams.get('take') || '10', 10);

    let query = `
      SELECT
        Id,
        EntryNumber,
        EntryDate,
        Description,
        Reference,
        SourceModule,
        SourceId,
        Status,
        PostedByUserId,
        CreatedAt
      FROM JournalEntries
      WHERE Status = 'POSTED'
    `;

    const db = await getDb();
    const request = db.request();

    if (entryNumber) {
      query += ` AND EntryNumber = @entryNumber`;
      request.input('entryNumber', entryNumber);
    }

    if (sourceModule) {
      query += ` AND SourceModule = @sourceModule`;
      request.input('sourceModule', sourceModule);
    }

    if (accountCode) {
      query += ` AND EXISTS (
        SELECT 1 FROM JournalEntryLines jel
        INNER JOIN ChartOfAccounts coa ON jel.AccountId = coa.Id
        WHERE jel.JournalEntryId = JournalEntries.Id AND coa.AccountCode = @accountCode
      )`;
      request.input('accountCode', accountCode);
    }

    query += ` ORDER BY EntryDate DESC OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY`;
    request.input('skip', skip);
    request.input('take', take);

    const result = await request.query(query);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        journalEntries: result.recordset,
        pagination: { skip, take, count: result.recordset.length },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ status: 'ERROR', message: err.message || 'Internal server error' }, { status: 500 });
  }
}
