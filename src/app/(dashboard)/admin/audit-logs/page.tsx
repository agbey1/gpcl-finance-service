'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import { api, errMsg, todayIso } from '@/lib/clientApi';

interface AuditRow {
  Id: number;
  EntityType: string;
  EntityId: string;
  Action: string;
  UserId: number;
  UserEmail: string | null;
  UserName: string | null;
  Description: string | null;
  IpAddress: string | null;
  CreatedAt: string;
  oldValue: unknown;
  newValue: unknown;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState(() => daysAgo(30));
  const [to, setTo] = useState(todayIso);
  const [entityType, setEntityType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ from, to, limit: '1000' });
      if (entityType) qs.set('entityType', entityType);
      const data = await api<{ auditLogs: AuditRow[] }>(`/api/v1/audit/logs?${qs}`);
      setLogs(data.auditLogs);
      setCurrentPage(1);
    } catch (e) {
      setError(errMsg(e, 'Failed to load audit trail'));
    } finally {
      setLoading(false);
    }
  }, [from, to, entityType]);

  useEffect(() => {
    // Load on mount; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Reload is manual (button) after the first load so typing dates does not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return logs.filter((l) =>
      [l.UserEmail, l.UserName, l.Action, l.EntityType, l.EntityId, l.Description].some((v) => (v || '').toLowerCase().includes(t))
    );
  }, [logs, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const inputStyle = { padding: '7px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>System Audit Trail</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
          Who posted, voided, reversed or changed what, and when.
        </p>
      </div>

      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '13px' }}>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} /></label>
        <label style={{ fontSize: '13px' }}>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} /></label>
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)} style={inputStyle}>
          <option value="">All entity types</option>
          {['INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'JOURNAL_ENTRY', 'CLIENT', 'USER', 'ROLE', 'SETTINGS', 'BANK_STATEMENT'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} />
          Apply
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Filter by user, action or details..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '14px' }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {error && <p style={{ color: '#dc2626', fontSize: '13px', padding: '12px' }}>{error}</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>}
            {!loading && paginated.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No audit events in this range.</td></tr>}
            {paginated.map((l) => (
              <Fragment key={l.Id}>
                <tr onClick={() => setExpanded(expanded === l.Id ? null : l.Id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{String(l.CreatedAt).replace('T', ' ').slice(0, 19)}</td>
                  <td style={{ fontWeight: '600' }}>{l.UserEmail || `User #${l.UserId}`}</td>
                  <td><span className="badge badge-info">{l.Action}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{l.EntityType} #{l.EntityId}</td>
                  <td style={{ fontSize: '13px' }}>{l.Description}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{l.IpAddress || '—'}</td>
                </tr>
                {expanded === l.Id && (
                  <tr>
                    <td colSpan={6}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                        <div><strong>Before</strong><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{l.oldValue ? JSON.stringify(l.oldValue, null, 2) : '—'}</pre></div>
                        <div><strong>After</strong><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{l.newValue ? JSON.stringify(l.newValue, null, 2) : '—'}</pre></div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}
