import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateApiAuth, serverError } from '@/lib/apiAuth';
import { logAudit } from '@/lib/auditLog';
import { z } from 'zod';

import sql from 'mssql';

const createClientSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  creditLimit: z.number().min(0).optional().nullable(),
  taxId: z.string().max(50).optional(),
});

const updateClientSchema = createClientSchema.partial();

export async function GET(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.clients.view');
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const rawSkip = parseInt(url.searchParams.get('skip') || '0', 10);
    const rawTake = parseInt(url.searchParams.get('take') || '10', 10);
    const skip = isNaN(rawSkip) || rawSkip < 0 ? 0 : rawSkip;
    const take = isNaN(rawTake) || rawTake <= 0 ? 10 : Math.min(rawTake, 100);

    const db = await getDb();
    const result = await db.request()
      .input('skip', sql.Int, skip)
      .input('take', sql.Int, take)
      .query(`
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
      WHERE IsActive = 1
      ORDER BY Name ASC
      OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
    `);

    return NextResponse.json(
      {
        status: 'SUCCESS',
        clients: result.recordset,
        pagination: { skip, take, count: result.recordset.length },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/clients');
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = validateApiAuth(req, 'finance.clients.create');
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parseResult = createClientSchema.safeParse(body);

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

    const { name, email, phone, address, creditLimit, taxId } = parseResult.data;
    const db = await getDb();

    // Check duplicate name
    const dupCheck = await db.request().input('name', name).query(`
      SELECT Id FROM Clients WHERE LOWER(Name) = LOWER(@name)
    `);

    if (dupCheck.recordset.length > 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Client with this name already exists' },
        { status: 409 }
      );
    }

    const result = await db.request()
      .input('name', name)
      .input('email', email || null)
      .input('phone', phone || null)
      .input('address', address || null)
      .input('creditLimit', creditLimit ?? null)
      .input('taxId', taxId || null)
      .query(`
        INSERT INTO Clients (Name, Email, Phone, Address, CreditLimit, TaxId, IsActive, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email, INSERTED.Phone, INSERTED.Address, INSERTED.CreditLimit, INSERTED.TaxId, INSERTED.IsActive, INSERTED.CreatedAt
        VALUES (@name, @email, @phone, @address, @creditLimit, @taxId, 1, GETDATE(), GETDATE())
      `);

    const insertedClient = result.recordset[0];

    // Log audit trail
    await logAudit({
      entityType: 'CLIENT',
      entityId: insertedClient.Id,
      action: 'CREATE',
      userId: session!.userId,
      newValue: {
        name: insertedClient.Name,
        email: insertedClient.Email,
        phone: insertedClient.Phone,
        address: insertedClient.Address,
        creditLimit: insertedClient.CreditLimit,
        taxId: insertedClient.TaxId,
      },
      description: `Client "${insertedClient.Name}" created`,
    });

    return NextResponse.json(
      {
        status: 'SUCCESS',
        client: insertedClient,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return serverError(err, '/api/v1/clients');
  }
}
