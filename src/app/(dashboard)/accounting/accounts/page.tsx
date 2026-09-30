'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, RefreshCw, Power } from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import { api, errMsg, fmt, postJson } from '@/lib/clientApi';

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

interface Account {
  AccountCode: string;
  AccountName: string;
  AccountType: AccountType;
  Category: string | null;
  IsControl: boolean;
  IsActive: boolean;
  TotalDebit: number;
  TotalCredit: number;
  Balance: number;
}

const TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | AccountType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [showAdd, setShowAdd] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('EXPENSE');
  const [category, setCategory] = useState('');
  const [isControl, setIsControl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ accounts: Account[] }>('/api/v1/accounting/accounts');
      setAccounts(data.accounts);
    } catch (e) {
      setError(errMsg(e, 'Failed to load chart of accounts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load on mount; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await postJson('/api/v1/accounting/accounts', {
        accountCode: code.trim().toUpperCase(),
        accountName: name.trim(),
        accountType: type,
        ...(category.trim() ? { category: category.trim() } : {}),
        isControl,
      });
      setShowAdd(false);
      setCode('');
      setName('');
      setCategory('');
      setIsControl(false);
      await load();
    } catch (err) {
      setFormError(errMsg(err, 'Failed to create account'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (a: Account) => {
    if (a.IsActive && Number(a.Balance) !== 0 && !confirm(`${a.AccountCode} has a balance of GHS ${fmt(a.Balance)}. Deactivate anyway? It will no longer accept postings.`)) return;
    try {
      await api(`/api/v1/accounting/accounts/${encodeURIComponent(a.AccountCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !a.IsActive }),
      });
      await load();
    } catch (e) {
      alert(errMsg(e, 'Update failed'));
    }
  };

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return accounts.filter(
      (a) => (filterType === 'ALL' || a.AccountType === filterType) &&
        (a.AccountCode.toLowerCase().includes(t) || a.AccountName.toLowerCase().includes(t))
    );
  }, [accounts, filterType, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalDebits = accounts.reduce((s, a) => s + Number(a.TotalDebit), 0);
  const totalCredits = accounts.reduce((s, a) => s + Number(a.TotalCredit), 0);
  const inputStyle = { width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Chart of Accounts</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            GL accounts with posted balances. Opening balances are entered as an opening journal on the <Link href="/accounting/vouchers">Vouchers</Link> page.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /></button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            New Account
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', ...TYPES] as const).map((t) => (
            <button key={t} onClick={() => { setFilterType(t); setCurrentPage(1); }} className={filterType === t ? 'btn btn-primary' : 'btn btn-secondary'}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', width: '260px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input type="text" placeholder="Search code or name..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }} />
        </div>
      </div>

      <div className="card">
        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Account name</th>
              <th>Type</th>
              <th>Category</th>
              <th>Control</th>
              <th style={{ textAlign: 'right' }}>Debits (GHS)</th>
              <th style={{ textAlign: 'right' }}>Credits (GHS)</th>
              <th style={{ textAlign: 'right' }}>Balance (GHS)</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>}
            {!loading && paginated.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No accounts found.</td></tr>}
            {paginated.map((a) => (
              <tr key={a.AccountCode} style={{ opacity: a.IsActive ? 1 : 0.55 }}>
                <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{a.AccountCode}</td>
                <td style={{ fontWeight: '600' }}>{a.AccountName}</td>
                <td><span className="badge badge-info">{a.AccountType}</span></td>
                <td>{a.Category || '—'}</td>
                <td>{a.IsControl ? 'Yes' : 'No'}</td>
                <td style={{ textAlign: 'right' }}>{fmt(a.TotalDebit)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(a.TotalCredit)}</td>
                <td style={{ textAlign: 'right', fontWeight: '700' }}>{fmt(a.Balance)}</td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => toggleActive(a)} title={a.IsActive ? 'Deactivate' : 'Activate'}>
                    <Power size={12} />
                    {a.IsActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {!loading && accounts.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: '700' }}>
                <td colSpan={5}>Ledger totals {Math.round(totalDebits * 100) === Math.round(totalCredits * 100) ? '(balanced)' : '(OUT OF BALANCE)'}</td>
                <td style={{ textAlign: 'right' }}>{fmt(totalDebits)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(totalCredits)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form className="card" onSubmit={addAccount} style={{ width: '460px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>New GL account</h2>
            <input placeholder="Account code, e.g. 6200" required pattern="[0-9A-Za-z-]{2,20}" value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle} />
            <input placeholder="Account name" required minLength={2} maxLength={255} value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <select value={type} onChange={(e) => setType(e.target.value as AccountType)} style={inputStyle}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Category (optional)" maxLength={100} value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} />
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
              <input type="checkbox" checked={isControl} onChange={(e) => setIsControl(e.target.checked)} />
              Control account (only posted through a sub-ledger, never by manual journal)
            </label>
            {formError && <p style={{ color: '#dc2626', fontSize: '13px' }}>{formError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create account'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
