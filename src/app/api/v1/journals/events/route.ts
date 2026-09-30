import { NextRequest, NextResponse } from 'next/server';
import { postJournal, ClosedPeriodError, UnbalancedJournalError } from '@/lib/accounting';
import { getIdempotentResponse, saveIdempotentResponse } from '@/lib/idempotency';
import { validateApiAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization & Permission check
    const { session, errorResponse } = validateApiAuth(req, 'accounting.journal.post');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { idempotencyKey: bodyKey, sourceModule, sourceId, entryDate, description, reference, postedBy, lines } = body;

    // 2. Idempotency Key validation from header or payload
    const idempotencyKey =
      req.headers.get('idempotency-key') ||
      req.headers.get('x-idempotency-key') ||
      bodyKey;

    if (idempotencyKey) {
      const cached = getIdempotentResponse(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached.responseBody, { status: cached.responseStatus });
      }
    }

    if (!sourceModule || !sourceId || !lines || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid payload: sourceModule, sourceId, and at least 2 journal lines are required.' },
        { status: 400 }
      );
    }

    const parsedDate = entryDate ? new Date(entryDate) : new Date();

    const result = await postJournal({
      entryDate: parsedDate,
      description: description || `Journal entry from ${sourceModule}`,
      reference,
      sourceModule,
      sourceId,
      lines,
      postedBy: session?.userId || postedBy || 1,
    });

    const successPayload = {
      status: 'SUCCESS',
      journalEntryId: result.journalEntryId,
      entryNumber: result.entryNumber,
      postedAt: new Date().toISOString(),
    };

    if (idempotencyKey) {
      saveIdempotentResponse(idempotencyKey, 201, successPayload);
    }

    return NextResponse.json(successPayload, { status: 201 });
  } catch (err: any) {
    if (err instanceof ClosedPeriodError) {
      return NextResponse.json(
        { status: 'ERROR', code: 'CLOSED_PERIOD_ERROR', message: err.message, financialYear: err.year },
        { status: 409 }
      );
    }

    if (err instanceof UnbalancedJournalError) {
      return NextResponse.json(
        { status: 'ERROR', code: 'UNBALANCED_JOURNAL', message: err.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
