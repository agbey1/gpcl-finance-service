import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings, updateSystemSettings } from '@/lib/settings';
import { validateApiAuth } from '@/lib/apiAuth';
import { logAudit } from '@/lib/auditLog';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const settings = await getSystemSettings();
    return NextResponse.json({
      status: 'SUCCESS',
      settings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'admin.roles.manage');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const userId = session?.userId || 1;

    const oldSettings = await getSystemSettings();
    const updatedSettings = await updateSystemSettings(body, userId);

    await logAudit({
      entityType: 'SETTINGS',
      entityId: 1,
      action: 'UPDATE',
      userId,
      oldValue: oldSettings,
      newValue: updatedSettings,
      description: 'System Settings & Financial Configurations updated',
    });

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'System configurations saved successfully',
      settings: updatedSettings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
