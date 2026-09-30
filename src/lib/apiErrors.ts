import { NextRequest, NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { ClosedPeriodError, InvalidJournalError, UnbalancedJournalError } from './accounting';
import { serverError } from './apiAuth';
import {
  getIdempotentResponse,
  releaseIdempotencyKey,
  reserveIdempotencyKey,
  saveIdempotentResponse,
} from './idempotency';

/** A business-rule rejection that should reach the client as-is. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorResponse(err: unknown, context: string): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { status: 'ERROR', ...(err.code ? { code: err.code } : {}), message: err.message, ...err.extra },
      { status: err.status }
    );
  }
  if (err instanceof ClosedPeriodError) {
    return NextResponse.json(
      { status: 'ERROR', code: 'CLOSED_PERIOD_ERROR', message: err.message, financialYear: err.year, period: err.period },
      { status: 409 }
    );
  }
  if (err instanceof UnbalancedJournalError) {
    return NextResponse.json({ status: 'ERROR', code: 'UNBALANCED_JOURNAL', message: err.message }, { status: 400 });
  }
  if (err instanceof InvalidJournalError) {
    return NextResponse.json({ status: 'ERROR', code: 'INVALID_JOURNAL', message: err.message }, { status: 400 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { status: 'ERROR', message: 'Invalid request parameters', errors: err.flatten().fieldErrors },
      { status: 400 }
    );
  }
  return serverError(err, context);
}

/** Parses and validates a JSON body; throws ApiError(400) / ZodError on bad input. */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
  return schema.parse(body);
}

/**
 * Runs a mutating handler at most once per Idempotency-Key. Keys are scoped to
 * the user and route so one user can never receive another's cached response,
 * and a key that is still being processed is rejected with 409 rather than
 * running the handler twice.
 */
export async function withIdempotency(
  req: NextRequest,
  scope: string,
  userId: number,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const rawKey = req.headers.get('idempotency-key') || req.headers.get('x-idempotency-key');
  if (!rawKey) return handler();
  if (rawKey.length > 200) {
    return NextResponse.json({ status: 'ERROR', message: 'Idempotency-Key is too long.' }, { status: 400 });
  }

  const key = `${userId}:${scope}:${rawKey}`;
  const cached = getIdempotentResponse(key);
  if (cached) {
    return NextResponse.json(cached.responseBody, {
      status: cached.responseStatus,
      headers: { 'Idempotent-Replayed': 'true' },
    });
  }
  if (!reserveIdempotencyKey(key)) {
    return NextResponse.json(
      { status: 'ERROR', code: 'IDEMPOTENCY_IN_PROGRESS', message: 'A request with this Idempotency-Key is already in progress.' },
      { status: 409 }
    );
  }

  try {
    const res = await handler();
    // Only successful results are replayed; failures may be retried with the same key.
    if (res.status >= 200 && res.status < 300) {
      saveIdempotentResponse(key, res.status, await res.clone().json());
    }
    return res;
  } finally {
    releaseIdempotencyKey(key);
  }
}
