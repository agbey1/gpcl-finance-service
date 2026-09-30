import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const { errorResponse } = validateApiAuth(req, 'accounting.journal.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const accountCode = url.searchParams.get('accountCode');
    const sourceModule = url.searchParams.get('sourceModule');
    const entryNumber = url.searchParams.get('entryNumber');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const skip = Math.max(0, parseInt(url.searchParams.get('skip') || '0', 10) || 0);
    const take = Math.min(5000, Math.max(1, parseInt(url.searchParams.get('take') || '10', 10) || 10));

    const db = await getDb();
    const request = db.request();
    const where: string[] = [`je.Status = 'POSTED'`];

    if (entryNumber) {
      where.push('je.EntryNumber = @entryNumber');
      request.input('entryNumber', entryNumber);
    }
    if (sourceModule) {
      where.push('je.SourceModule = @sourceModule');
      request.input('sourceModule', sourceModule);
    }
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      where.push('je.EntryDate >= @from');
      request.input('from', from);
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      where.push('je.EntryDate < DATEADD(day, 1, CAST(@to AS date))');
      request.input('to', to);
    }
    if (accountCode) {
      where.push(`EXISTS (
        SELECT 1 FROM JournalEntryLines jel
        INNER JOIN Accounts a ON jel.AccountId = a.Id
        WHERE jel.JournalEntryId = je.Id AND a.Code = @accountCode
      )`);
      request.input('accountCode', accountCode);
    }
    request.input('skip', skip);
    request.input('take', take);

    if (url.searchParams.get('lines') === '1') {
      // Day-book view: one row per journal line.
      const lineRows = await request.query(`
        SELECT je.Id AS JournalEntryId, je.EntryNumber, je.EntryDate, je.SourceModule, je.Reference,
               je.Description AS EntryDescription, a.Code AS AccountCode, a.AccountName,
               l.Description, l.Debit, l.Credit
        FROM JournalEntries je
        INNER JOIN JournalEntryLines l ON l.JournalEntryId = je.Id
        INNER JOIN Accounts a ON a.Id = l.AccountId
        WHERE ${where.join(' AND ')}
        ORDER BY je.EntryDate, je.Id, l.Id
        OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
      `);
      return NextResponse.json({
        status: 'SUCCESS',
        lines: lineRows.recordset,
        pagination: { skip, take, count: lineRows.recordset.length },
      });
    }

    const result = await request.query(`
      SELECT
        je.Id, je.EntryNumber, je.EntryDate, je.Description, je.Reference,
        je.SourceModule, je.SourceId, je.Status, je.ReversalOfId, je.PostedBy, je.CreatedAt,
        u.Name AS PostedByName,
        t.TotalDebit, t.TotalCredit,
        (SELECT TOP 1 r.EntryNumber FROM JournalEntries r WHERE r.ReversalOfId = je.Id) AS ReversedBy
      FROM JournalEntries je
      LEFT JOIN Users u ON u.Id = je.PostedBy
      OUTER APPLY (
        SELECT ISNULL(SUM(l.Debit), 0) AS TotalDebit, ISNULL(SUM(l.Credit), 0) AS TotalCredit
        FROM JournalEntryLines l WHERE l.JournalEntryId = je.Id
      ) t
      WHERE ${where.join(' AND ')}
      ORDER BY je.EntryDate DESC, je.Id DESC
      OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
    `);

    return NextResponse.json({
      status: 'SUCCESS',
      journalEntries: result.recordset,
      pagination: { skip, take, count: result.recordset.length },
    });
  } catch (err) {
    return serverError(err, '/api/v1/journals/events/query');
  }
}
