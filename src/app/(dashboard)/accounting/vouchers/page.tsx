'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Check, Keyboard, Trash2 } from 'lucide-react';
import { api, errMsg, fmt, newKey, postJson, todayIso } from '@/lib/clientApi';

type VoucherType = 'JOURNAL' | 'PAYMENT' | 'RECEIPT' | 'CONTRA';

const VOUCHER_TYPES: { type: VoucherType; key: string; label: string; hint: string }[] = [
  { type: 'JOURNAL', key: 'F7', label: 'Journal Voucher (F7)', hint: 'Adjustments, accruals, reclassifications' },
  { type: 'PAYMENT', key: 'F5', label: 'Payment Voucher (F5)', hint: 'Expenses paid from cash or bank' },
  { type: 'RECEIPT', key: 'F6', label: 'Receipt Voucher (F6)', hint: 'Non-customer receipts (customer receipts: Payments page)' },
  { type: 'CONTRA', key: 'F4', label: 'Contra Voucher (F4)', hint: 'Transfers between cash and bank accounts' },
];

interface Account {
  AccountCode: string;
  AccountName: string;
  AccountType: string;
  IsControl: boolean;
  IsActive: boolean;
}

interface Line {
  accountCode: string;
  description: string;
  debit: string;
  credit: string;
}

const emptyLine = (): Line => ({ accountCode: '', description: '', debit: '', credit: '' });
const cents = (v: string) => Math.round((parseFloat(v) || 0) * 100);

export default function VouchersPage() {
  const [voucherType, setVoucherType] = useState<VoucherType>('JOURNAL');
  const [voucherDate, setVoucherDate] = useState(todayIso);
  const [reference, setReference] = useState('');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [posted, setPosted] = useState('');
  const [submitKey, setSubmitKey] = useState(newKey);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await api<{ accounts: Account[] }>('/api/v1/accounting/accounts');
      setAccounts(data.accounts.filter((a) => a.IsActive && !a.IsControl));
    } catch (e) {
      setError(errMsg(e, 'Failed to load chart of accounts'));
    }
  }, []);

  useEffect(() => {
    // Load on mount; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const match = VOUCHER_TYPES.find((v) => v.key === e.key);
      if (match) {
        e.preventDefault();
        setVoucherType(match.type);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const totalDebit = lines.reduce((acc, l) => acc + cents(l.debit), 0);
  const totalCredit = lines.reduce((acc, l) => acc + cents(l.credit), 0);
  const linesValid = lines.every(
    (l) => l.accountCode && ((cents(l.debit) > 0) !== (cents(l.credit) > 0)) && cents(l.debit) >= 0 && cents(l.credit) >= 0
  );
  const canPost = linesValid && lines.length >= 2 && totalDebit > 0 && totalDebit === totalCredit && narration.trim().length >= 3;

  const updateLine = (index: number, field: keyof Line, value: string) => {
    setLines(lines.map((l, i) => {
      if (i !== index) return l;
      const next = { ...l, [field]: value };
      // A line is either a debit or a credit.
      if (field === 'debit' && value) next.credit = '';
      if (field === 'credit' && value) next.debit = '';
      return next;
    }));
  };

  const reset = () => {
    setReference('');
    setNarration('');
    setLines([emptyLine(), emptyLine()]);
    setSubmitKey(newKey());
  };

  const post = async () => {
    if (!canPost || saving) return;
    setSaving(true);
    setError('');
    setPosted('');
    try {
      const res = await postJson<{ entryNumber: string }>(
        '/api/v1/journals/events',
        {
          sourceModule: `MANUAL_${voucherType}`,
          sourceId: reference.trim() || submitKey.slice(0, 50),
          entryDate: voucherDate,
          description: narration.trim(),
          ...(reference.trim() ? { reference: reference.trim() } : {}),
          lines: lines.map((l) => ({
            accountCode: l.accountCode,
            description: l.description.trim() || undefined,
            ...(cents(l.debit) > 0 ? { debit: cents(l.debit) / 100 } : { credit: cents(l.credit) / 100 }),
          })),
        },
        submitKey
      );
      setPosted(res.entryNumber);
      reset();
    } catch (e) {
      setError(errMsg(e, 'Posting failed'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' };
  const current = VOUCHER_TYPES.find((v) => v.type === voucherType)!;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Voucher Entry</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Post balanced manual journals. Sales, customer receipts and credit notes are entered on the Invoices and Payments pages so the receivables ledger stays in step.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Keyboard size={16} color="var(--accent-primary)" />
          F4 Contra · F5 Payment · F6 Receipt · F7 Journal
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {VOUCHER_TYPES.map((item) => (
          <button
            key={item.type}
            onClick={() => setVoucherType(item.type)}
            className={voucherType === item.type ? 'btn btn-primary' : 'btn btn-secondary'}
            title={item.hint}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card">
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>{current.hint}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Voucher date</label>
            <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Reference</label>
            <input type="text" maxLength={50} placeholder="e.g. MEMO-991 / CHQ-0012" value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Narration</label>
            <input type="text" maxLength={500} placeholder="What is this entry for?" value={narration} onChange={(e) => setNarration(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <table className="data-table" style={{ marginBottom: '16px' }}>
          <thead>
            <tr>
              <th style={{ width: '32%' }}>Account</th>
              <th>Line description</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Debit (GHS)</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Credit (GHS)</th>
              <th style={{ width: '40px' }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td>
                  <select value={line.accountCode} onChange={(e) => updateLine(idx, 'accountCode', e.target.value)} style={inputStyle}>
                    <option value="">Select account…</option>
                    {accounts.map((a) => (
                      <option key={a.AccountCode} value={a.AccountCode}>{a.AccountCode} — {a.AccountName}</option>
                    ))}
                  </select>
                </td>
                <td><input type="text" maxLength={500} value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} style={inputStyle} /></td>
                <td><input type="number" min="0" step="0.01" value={line.debit} onChange={(e) => updateLine(idx, 'debit', e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} /></td>
                <td><input type="number" min="0" step="0.01" value={line.credit} onChange={(e) => updateLine(idx, 'credit', e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} /></td>
                <td>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 6px' }} disabled={lines.length <= 2} onClick={() => setLines(lines.filter((_, i) => i !== idx))} title="Remove line">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: '700' }}>
              <td colSpan={2}>Totals</td>
              <td style={{ textAlign: 'right' }}>{fmt(totalDebit / 100)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(totalCredit / 100)}</td>
              <td />
            </tr>
          </tfoot>
        </table>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setLines([...lines, emptyLine()])}>
            <Plus size={14} />
            Add line
          </button>
          <span style={{ fontSize: '13px', color: totalDebit === totalCredit && totalDebit > 0 ? '#059669' : '#dc2626' }}>
            {totalDebit === totalCredit && totalDebit > 0 ? 'Balanced' : `Out of balance by GHS ${fmt(Math.abs(totalDebit - totalCredit) / 100)}`}
          </span>
          <span style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={post} disabled={!canPost || saving}>
            <Check size={14} />
            {saving ? 'Posting…' : 'Post voucher'}
          </button>
        </div>

        {!linesValid && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>Each line needs an account and exactly one of debit or credit.</p>}
        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '10px' }}>{error}</p>}
        {posted && (
          <p style={{ color: '#059669', fontSize: '13px', marginTop: '10px' }}>
            Posted {posted}. <Link href="/accounting/journal-entries">View journal register</Link>
          </p>
        )}
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Control accounts (receivables, payables, inventory) are not offered here; they are posted through their own modules.
        </p>
      </div>
    </div>
  );
}
