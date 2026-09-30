import { NextRequest, NextResponse } from 'next/server';
import { parseBankStatementCsv } from '@/lib/bankStatementParser';
import { saveAndMatchBankStatement, ReconciliationError } from '@/lib/reconciliation';
import { validateApiAuth } from '@/lib/apiAuth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_TYPES = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bankAccountId: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'reconciliation.manage');
  if (errorResponse) return errorResponse;

  try {
    const { bankAccountId: rawId } = await params;
    const bankAccountId = parseInt(rawId, 10);

    if (isNaN(bankAccountId) || bankAccountId <= 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid bankAccountId parameter' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { status: 'ERROR', message: 'CSV file upload is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Only .csv files are accepted' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { status: 'ERROR', message: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'File is empty' },
        { status: 400 }
      );
    }

    // Parse CSV
    const csvContent = await file.text();
    const { rows, warnings } = parseBankStatementCsv(csvContent);

    if (rows.length === 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'No valid data rows found in CSV file', warnings },
        { status: 400 }
      );
    }

    // Cap row processing to prevent DoS
    if (rows.length > 50000) {
      return NextResponse.json(
        { status: 'ERROR', message: 'CSV contains too many rows (max 50,000)' },
        { status: 400 }
      );
    }

    const userId = session?.userId || 1;
    const result = await saveAndMatchBankStatement(bankAccountId, file.name, userId, rows);

    return NextResponse.json({
      status: 'SUCCESS',
      statementId: result.statementId,
      bankAccountId,
      filename: file.name,
      totalRowsParsed: result.totalLines,
      autoMatchedCount: result.autoMatchedCount,
      unmatchedCount: result.totalLines - result.autoMatchedCount,
      matchPercentage: result.totalLines > 0 ? Math.round((result.autoMatchedCount / result.totalLines) * 100) : 0,
      lines: result.processedLines,
      warnings,
    }, { status: 201 });
  } catch (err: any) {
    if (err instanceof ReconciliationError) {
      return NextResponse.json(
        { status: 'ERROR', message: err.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
