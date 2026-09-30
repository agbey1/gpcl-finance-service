import { loginSchema, createPaymentSchema, postJournalEntrySchema } from '../lib/validation';

describe('Validation Schemas', () => {
  it('should validate valid login payload', () => {
    const valid = loginSchema.safeParse({ email: 'admin@gpcl.com', password: 'Password123!' });
    expect(valid.success).toBe(true);
  });

  it('should reject invalid login email format', () => {
    const invalid = loginSchema.safeParse({ email: 'invalid-email', password: '123' });
    expect(invalid.success).toBe(false);
  });

  it('should enforce balanced debits and credits in journal entries', () => {
    const balanced = postJournalEntrySchema.safeParse({
      entryDate: '2026-08-30',
      description: 'Vendor payment posting',
      lines: [
        { accountCode: '1100', debit: 5000, credit: 0 },
        { accountCode: '2000', debit: 0, credit: 5000 },
      ],
    });
    expect(balanced.success).toBe(true);

    const unbalanced = postJournalEntrySchema.safeParse({
      entryDate: '2026-08-30',
      description: 'Unbalanced posting',
      lines: [
        { accountCode: '1100', debit: 5000, credit: 0 },
        { accountCode: '2000', debit: 0, credit: 4000 },
      ],
    });
    expect(unbalanced.success).toBe(false);
  });
});
