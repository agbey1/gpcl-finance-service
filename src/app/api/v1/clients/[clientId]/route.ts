import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { logAudit } from '@/lib/auditLog';
import { z } from 'zod';

const updateClientSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  creditLimit: z.number().min(0).optional().nullable(),
  taxId: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.clients.view');
  if (errorResponse) return errorResponse;

  try {
    const { clientId } = await params;
    const id = parseInt(clientId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ status: 'ERROR', message: 'Invalid client ID' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.request().input('id', id).query(`
      SELECT
        Id,
        Name,
        Email,
        Phone,
        Address,
        CreditLimit,
        TaxId,
        IsActive,
        CreatedAt,
        UpdatedAt
      FROM Clients
      WHERE Id = @id
    `);

    if (!result.recordset.length) {
      return NextResponse.json({ status: 'ERROR', message: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(
      { status: 'SUCCESS', client: result.recordset[0] },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/clients/[clientId]');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.clients.update');
  if (errorResponse) return errorResponse;

  try {
    const { clientId } = await params;
    const id = parseInt(clientId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ status: 'ERROR', message: 'Invalid client ID' }, { status: 400 });
    }

    const body = await req.json();
    const parseResult = updateClientSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          status: 'ERROR',
          message: 'Invalid request parameters',
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updates = parseResult.data;
    const db = await getDb();

    // Check if client exists
    const checkRes = await db.request().input('id', id).query(`
      SELECT Id FROM Clients WHERE Id = @id
    `);

    if (!checkRes.recordset.length) {
      return NextResponse.json({ status: 'ERROR', message: 'Client not found' }, { status: 404 });
    }

    // Check duplicate name if changing
    if (updates.name) {
      const dupCheck = await db.request()
        .input('name', updates.name)
        .input('id', id)
        .query(`SELECT Id FROM Clients WHERE LOWER(Name) = LOWER(@name) AND Id <> @id`);

      if (dupCheck.recordset.length > 0) {
        return NextResponse.json(
          { status: 'ERROR', message: 'Client with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Fetch old values for audit trail
    const oldRes = await db.request().input('id', id).query(`
      SELECT Name, Email, Phone, Address, CreditLimit, TaxId, IsActive FROM Clients WHERE Id = @id
    `);
    const oldClient = oldRes.recordset[0];

    const request = db.request().input('id', id);
    const setClauses: string[] = ['UpdatedAt = GETDATE()'];

    if (updates.name !== undefined) {
      request.input('name', updates.name);
      setClauses.push('Name = @name');
    }
    if (updates.email !== undefined) {
      request.input('email', updates.email || null);
      setClauses.push('Email = @email');
    }
    if (updates.phone !== undefined) {
      request.input('phone', updates.phone || null);
      setClauses.push('Phone = @phone');
    }
    if (updates.address !== undefined) {
      request.input('address', updates.address || null);
      setClauses.push('Address = @address');
    }
    if (updates.creditLimit !== undefined) {
      request.input('creditLimit', updates.creditLimit ?? null);
      setClauses.push('CreditLimit = @creditLimit');
    }
    if (updates.taxId !== undefined) {
      request.input('taxId', updates.taxId || null);
      setClauses.push('TaxId = @taxId');
    }
    if (updates.isActive !== undefined) {
      request.input('isActive', updates.isActive ? 1 : 0);
      setClauses.push('IsActive = @isActive');
    }

    await request.query(`
      UPDATE Clients
      SET ${setClauses.join(', ')}
      WHERE Id = @id
    `);

    const updatedRes = await db.request().input('id', id).query(`
      SELECT
        Id,
        Name,
        Email,
        Phone,
        Address,
        CreditLimit,
        TaxId,
        IsActive,
        CreatedAt,
        UpdatedAt
      FROM Clients
      WHERE Id = @id
    `);

    const updatedClient = updatedRes.recordset[0];

    // Log audit trail with old and new values
    await logAudit({
      entityType: 'CLIENT',
      entityId: id,
      action: 'UPDATE',
      userId: session!.userId,
      oldValue: {
        name: oldClient.Name,
        email: oldClient.Email,
        phone: oldClient.Phone,
        address: oldClient.Address,
        creditLimit: oldClient.CreditLimit,
        taxId: oldClient.TaxId,
      },
      newValue: {
        name: updatedClient.Name,
        email: updatedClient.Email,
        phone: updatedClient.Phone,
        address: updatedClient.Address,
        creditLimit: updatedClient.CreditLimit,
        taxId: updatedClient.TaxId,
      },
      description: `Client "${updatedClient.Name}" updated`,
    });

    return NextResponse.json(
      { status: 'SUCCESS', client: updatedClient },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/clients/[clientId]');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.clients.delete');
  if (errorResponse) return errorResponse;

  try {
    const { clientId } = await params;
    const id = parseInt(clientId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ status: 'ERROR', message: 'Invalid client ID' }, { status: 400 });
    }

    const db = await getDb();

    // Get client details before deletion
    const clientRes = await db.request().input('id', id).query(`
      SELECT Id, Name, Email, Phone, Address, CreditLimit, TaxId FROM Clients WHERE Id = @id
    `);

    if (!clientRes.recordset.length) {
      return NextResponse.json({ status: 'ERROR', message: 'Client not found' }, { status: 404 });
    }

    const deletedClient = clientRes.recordset[0];

    // Soft delete
    await db.request().input('id', id).query(`
      UPDATE Clients SET IsActive = 0, UpdatedAt = GETDATE() WHERE Id = @id
    `);

    // Log audit trail
    await logAudit({
      entityType: 'CLIENT',
      entityId: id,
      action: 'DELETE',
      userId: session!.userId,
      oldValue: {
        name: deletedClient.Name,
        email: deletedClient.Email,
        phone: deletedClient.Phone,
        address: deletedClient.Address,
        creditLimit: deletedClient.CreditLimit,
        taxId: deletedClient.TaxId,
      },
      description: `Client "${deletedClient.Name}" deactivated (soft delete)`,
    });

    return NextResponse.json(
      { status: 'SUCCESS', message: 'Client deactivated successfully' },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/clients/[clientId]');
  }
}
