import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createUserSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().min(1, 'Role is required'),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address format').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.string().min(1, 'Role is required').optional(),
  isActive: z.boolean().optional(),
});


export const createInvoiceSchema = z.object({
  clientId: z.number().int().positive('Client ID is required'),
  invoiceDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  items: z.array(
    z.object({
      description: z.string().min(1, 'Item description is required'),
      quantity: z.number().positive('Quantity must be greater than 0'),
      unitPrice: z.number().nonnegative('Unit price cannot be negative'),
      taxRate: z.number().nonnegative().optional().default(0),
    })
  ).min(1, 'Invoice must contain at least one line item'),
  notes: z.string().optional(),
});

export const createPaymentSchema = z.object({
  invoiceId: z.number().int().positive('Invoice ID is required'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'MOBILE_MONEY']),
  referenceNumber: z.string().min(1, 'Reference number is required'),
});

export const postJournalEntrySchema = z.object({
  entryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  description: z.string().min(3, 'Journal entry description is required'),
  lines: z.array(
    z.object({
      accountCode: z.string().min(1, 'Account code is required'),
      debit: z.number().nonnegative(),
      credit: z.number().nonnegative(),
    })
  ).min(2, 'Journal entry must have at least 2 lines (debit and credit)'),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.001;
  },
  { message: 'Journal entry debits and credits must balance' }
);
