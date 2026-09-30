'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, RotateCcw, Eye, RefreshCw } from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import { api, day, errMsg, fmt, postJson } from '@/lib/clientApi';

interface JournalRow {
  Id: number;
  EntryNumber: string;
  EntryDate: string;
  Description: string;
  Reference: string | null;
  SourceModule: string;
  ReversalOfId: number | null;
  PostedByName: string | null;
  TotalDebit: number;
  TotalCredit: number;
  ReversedBy: string | null;
}

interface JournalDetail extends JournalRow {
  lines: { Id: number; AccountCode: string; AccountName: string; Description: string | null; Debit: number; Credit: number }[];
}

const isManual = (j: { SourceModule: string }) => j.SourceModule.toUpperCase().startsWith('MANUAL');

export default function JournalEntriesPage() {
  const [journals, setJournals] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<JournalDetail | null>(null);
  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ journalEntries: JournalRow[] }>('/api/v1/journals/events/query?take=500');
      setJournals(data.journalEntries);
    } catch (e) {
      setError(errMsg(e, 'Failed to load journals'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load on mount; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const open = async (j: JournalRow) => {
    try {
      const data = await api<{ journalEntry: JournalDetail }>(`/api/v1/journals/${j.Id}`);
      setSelected(data.journalEntry);
    } catch (e) {
      alert(errMsg(e, 'Failed to load journal'));
    }
  };

  const reverse = async (j: JournalRow) => {
    const reason = prompt(`Reverse ${j.EntryNumber}? A mirror-image journal will be posted.\n\nReason:`);
    if (!reason || reason.trim().length < 3) return;
    try {
      const res = await postJson<{ reversalEntryNumber: string }>(`/api/v1/journals/${j.Id}/reverse`, { reason: reason.trim() });
      alert(`Posted reversal ${res.reversalEntryNumber}.`);
      setSelected(null);
      await load();
    } catch (e) {
      alert(errMsg(e, 'Reversal failed'));
    }
  };

  const modules = useMemo(() => ['ALL', ...Array.from(new Set(journals.map((j) => j.SourceModule))).sort()], [journals]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return journals.filter(
      (j) =>
        (moduleFilter === 'ALL' || j.SourceModule === moduleFilter) &&
        (j.EntryNumber.toLowerCase().includes(term) ||
          j.Description.toLowerCase().includes(term) ||
          (j.Reference || '').toLowerCase().includes(term))
    );
  }, [journals, searchTerm, moduleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Journal Entries & Ledger Audit</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            General Ledger journal register. Manual journals can be reversed; system journals are corrected through their source document.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <Link href="/accounting/vouchers" className="btn btn-primary">
            <Plus size={16} />
            New Manual Journal
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Search size={16} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Filter by entry #, reference or description..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '14px' }}
        />
        <select
          value={moduleFilter}
          onChange={(e) => { setModuleFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {error && <p style={{ color: '#dc2626', fontSize: '13px', padding: '12px' }}>{error}</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>Entry Number</th>
              <th>Date</th>
              <th>Source</th>
              <th>Reference</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Debits (GHS)</th>
              <th style={{ textAlign: 'right' }}>Credits (GHS)</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>}
            {!loading && paginated.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No journal entries found.</td></tr>}
            {paginated.map((j) => (
              <tr key={j.Id}>
                <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{j.EntryNumber}</td>
                <td>{day(j.EntryDate)}</td>
                <td><span className="badge badge-info">{j.SourceModule}</span></td>
                <td>{j.Reference || '—'}</td>
                <td>{j.Description}</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(j.TotalDebit)}</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(j.TotalCredit)}</td>
                <td>
                  {j.ReversedBy ? (
                    <span className="badge badge-danger" title={`Reversed by ${j.ReversedBy}`}>REVERSED</span>
                  ) : j.ReversalOfId ? (
                    <span className="badge badge-warning">REVERSAL</span>
                  ) : (
                    <span className="badge badge-success">POSTED</span>
                  )}
                </td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button onClick={() => open(j)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }}>
                    <Eye size={12} />
                    View
                  </button>
                  {isManual(j) && !j.ReversedBy && !j.ReversalOfId && (
                    <button onClick={() => reverse(j)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                      <RotateCcw size={12} />
                      Reverse
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>

      {selected && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '760px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{selected.EntryNumber}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 16px' }}>
              {day(selected.EntryDate)} · {selected.SourceModule} · {selected.Reference || 'no reference'} · posted by {selected.PostedByName || '—'}
              {selected.ReversedBy && <> · reversed by {selected.ReversedBy}</>}
            </p>
            <p style={{ fontSize: '14px', marginBottom: '12px' }}>{selected.Description}</p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Debit</th>
                  <th style={{ textAlign: 'right' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {selected.lines.map((l) => (
                  <tr key={l.Id}>
                    <td><span style={{ fontFamily: 'monospace' }}>{l.AccountCode}</span> {l.AccountName}</td>
                    <td>{l.Description}</td>
                    <td style={{ textAlign: 'right' }}>{Number(l.Debit) ? fmt(l.Debit) : ''}</td>
                    <td style={{ textAlign: 'right' }}>{Number(l.Credit) ? fmt(l.Credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              {isManual(selected) && !selected.ReversedBy && !selected.ReversalOfId && (
                <button className="btn btn-secondary" onClick={() => reverse(selected)} style={{ marginRight: 'auto' }}>
                  <RotateCcw size={14} />
                  Reverse
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
