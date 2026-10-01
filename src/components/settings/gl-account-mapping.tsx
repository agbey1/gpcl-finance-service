'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, Save } from 'lucide-react';
import { api, errMsg } from '@/lib/clientApi';

interface RoleRow {
  role: string;
  label: string;
  accountType: string;
  code: string;
  locked: boolean;
}
interface Account {
  Code: string;
  AccountName: string;
  AccountType: string;
}

const inputStyle = { width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' };

export default function GlAccountMapping() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setProblems([]);
    try {
      const d = await api<{ roles: RoleRow[]; accounts: Account[] }>('/api/v1/settings/gl-accounts');
      setRoles(d.roles);
      setAccounts(d.accounts);
      setDraft(Object.fromEntries(d.roles.map((r) => [r.role, r.code])));
    } catch (e) {
      setProblems([errMsg(e, 'Failed to load the account mapping')]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const changed = roles.filter((r) => draft[r.role] !== r.code);

  const save = async () => {
    setSaving(true);
    setProblems([]);
    setNotice('');
    try {
      const res = await fetch('/api/v1/settings/gl-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping: Object.fromEntries(changed.map((r) => [r.role, draft[r.role]])) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblems(data.problems ?? [data.message || `Save failed (${res.status})`]);
        return;
      }
      setNotice('Account mapping saved. New postings will use these accounts.');
      await load();
    } catch (e) {
      setProblems([errMsg(e, 'Save failed')]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading account mapping…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '700' }}>GL Accounts for System Postings</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
        Accounts that invoices, payments, voids and credit notes post to, and that the levy return and dashboard read.
        Receivables, revenue and levy accounts lock once they have postings, because voids and credit notes reverse through them.
      </p>

      {problems.length > 0 && (
        <ul style={{ color: '#dc2626', fontSize: '13px', margin: 0, paddingLeft: '18px' }}>
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      {notice && <p style={{ color: '#059669', fontSize: '13px', margin: 0 }}>{notice}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {roles.map((r) => (
          <div key={r.role}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              {r.label}
              {r.locked && <span title="Has postings; cannot be changed"><Lock size={12} /></span>}
            </label>
            <select
              value={draft[r.role] ?? ''}
              disabled={r.locked || saving}
              onChange={(e) => setDraft({ ...draft, [r.role]: e.target.value })}
              style={inputStyle}
            >
              {accounts
                .filter((a) => a.AccountType === r.accountType || a.Code === r.code)
                .map((a) => (
                  <option key={a.Code} value={a.Code}>{a.Code} · {a.AccountName}</option>
                ))}
            </select>
          </div>
        ))}
      </div>

      <div>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || changed.length === 0}>
          <Save size={16} />
          {saving ? 'Saving…' : `Save account mapping${changed.length ? ` (${changed.length} change${changed.length > 1 ? 's' : ''})` : ''}`}
        </button>
      </div>
    </div>
  );
}
