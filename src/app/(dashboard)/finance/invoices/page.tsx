'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Download, Eye, Printer, RefreshCw, Ban } from 'lucide-react';
import { exportToPdf } from '@/lib/exportUtils';
import Pagination from '@/components/ui/pagination';

interface LineItem {
  id: number;
  description: string;
  qty: number;
  unitPrice: number;
}

interface Client {
  Id: number;
  Name: string;
}

interface InvoiceRow {
  Id: number;
  InvoiceNumber: string;
  ClientId: number;
  ClientName: string | null;
  InvoiceDate: string;
  DueDate: string;
  SubTotal: number;
  VatAmount: number;
  NhisAmount: number;
  GetfundAmount: number;
  TotalAmount: number;
  BalanceDue: number;
  Status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'VOID';
}

interface InvoiceDetails extends InvoiceRow {
  lines: { LineNumber: number; Description: string; Quantity: number; UnitPrice: number; LineTotal: number }[];
}

const STATUSES = ['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID'] as const;

const fmt = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (d: string) => (d ? String(d).slice(0, 10) : '');
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const todayIso = () => new Date().toISOString().slice(0, 10);
// crypto.randomUUID is unavailable on plain-http origins, so fall back.
const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const isOverdue = (inv: InvoiceRow) =>
  (inv.Status === 'UNPAID' || inv.Status === 'PARTIAL') && Number(inv.BalanceDue) > 0 && day(inv.DueDate) < todayIso();

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === 'ERROR') {
    if (res.status === 401) window.location.href = '/login';
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [filterStatus, setFilterStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null);

  // Form state
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: 1, description: '', qty: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);
  // One key per form, so a double submit or retry cannot post the invoice twice.
  const [submitKey, setSubmitKey] = useState(newKey);
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const [inv, cl] = await Promise.all([
        api<{ invoices: InvoiceRow[] }>('/api/v1/invoices/query?take=200'),
        api<{ clients: Client[] }>('/api/v1/clients?take=100'),
      ]);
      setInvoices(inv.invoices);
      setClients(cl.clients);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    // Initial data load; state is set asynchronously after the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Preview only; the server computes the authoritative amounts.
  const netTotal = round2(lineItems.reduce((sum, item) => sum + round2(item.qty * item.unitPrice), 0));
  const vatTotal = round2(netTotal * 0.15);
  const nhisTotal = round2(netTotal * 0.025);
  const getfundTotal = round2(netTotal * 0.025);
  const grossTotal = round2(netTotal + vatTotal + nhisTotal + getfundTotal);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { id: Math.max(0, ...lineItems.map((l) => l.id)) + 1, description: '', qty: 1, unitPrice: 0 }]);
  };

  const handleRemoveLineItem = (id: number) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter((l) => l.id !== id));
  };

  const handleLineChange = (id: number, field: keyof LineItem, val: string | number) => {
    setLineItems(lineItems.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const resetForm = () => {
    setClientId('');
    setDueDate('');
    setLineItems([{ id: 1, description: '', qty: 1, unitPrice: 0 }]);
    setErrorMsg('');
    setSubmitKey(newKey());
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || netTotal <= 0 || saving) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await api('/api/v1/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': submitKey },
        body: JSON.stringify({
          clientId: Number(clientId),
          ...(dueDate ? { dueDate } : {}),
          lineItems: lineItems.map((i) => ({ description: i.description.trim(), quantity: i.qty, unitPrice: i.unitPrice })),
          applyGhanaLevies: true,
        }),
      });
      resetForm();
      setShowCreateModal(false);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const openInvoice = async (inv: InvoiceRow) => {
    try {
      const data = await api<{ invoice: InvoiceDetails }>(`/api/v1/invoices/${inv.Id}/details`);
      setSelectedInvoice(data.invoice);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load invoice');
    }
  };

  const handleVoidInvoice = async (inv: InvoiceDetails) => {
    const reason = prompt(`Void ${inv.InvoiceNumber}? This posts a reversing General Ledger entry.\n\nReason:`);
    if (!reason || reason.trim().length < 3) return;
    try {
      await api(`/api/v1/invoices/${inv.Id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setSelectedInvoice(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to void invoice');
    }
  };

  const handleExportSinglePdf = (inv: InvoiceDetails) => {
    exportToPdf(
      `TAX INVOICE ${inv.InvoiceNumber} - BILLED TO: ${(inv.ClientName || '').toUpperCase()}`,
      [
        { header: 'Item Description', key: 'description' },
        { header: 'Qty', key: 'qty' },
        { header: 'Unit Price (GHS)', key: 'unitPrice' },
        { header: 'Total Price (GHS)', key: 'total' },
      ],
      inv.lines.map((l) => ({
        description: l.Description,
        qty: Number(l.Quantity),
        unitPrice: fmt(l.UnitPrice),
        total: fmt(l.LineTotal),
      })),
      `Invoice_${inv.InvoiceNumber}`
    );
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return invoices.filter((inv) => {
      const matchesStatus =
        filterStatus === 'ALL' || (filterStatus === 'OVERDUE' ? isOverdue(inv) : inv.Status === filterStatus);
      const matchesSearch =
        inv.InvoiceNumber.toLowerCase().includes(term) || (inv.ClientName || '').toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [invoices, filterStatus, searchTerm]);

  const live = invoices.filter((i) => i.Status !== 'VOID');
  const totalInvoiced = live.reduce((sum, i) => sum + Number(i.TotalAmount), 0);
  const totalOutstanding = live.reduce((sum, i) => sum + Number(i.BalanceDue), 0);
  const totalSettled = totalInvoiced - totalOutstanding;
  const totalOverdue = live.filter(isOverdue).reduce((sum, i) => sum + Number(i.BalanceDue), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedInvoices = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const inputStyle = { padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Invoicing & Accounts Receivable (AR)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Generate customer invoices with Ghana levies (15% VAT, 2.5% NHIL, 2.5% GETFund) and track receivables.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loadingList}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            className="btn btn-secondary"
            onClick={() =>
              exportToPdf(
                'INVOICES & ACCOUNTS RECEIVABLE REGISTER',
                [
                  { header: 'Invoice #', key: 'InvoiceNumber' },
                  { header: 'Date', key: 'date' },
                  { header: 'Customer', key: 'ClientName' },
                  { header: 'Net Amount', key: 'SubTotal' },
                  { header: 'Gross Amount', key: 'TotalAmount' },
                  { header: 'Balance Due', key: 'BalanceDue' },
                  { header: 'Status', key: 'Status' },
                ],
                filtered.map((i) => ({ ...i, date: day(i.InvoiceDate) })),
                'Invoices_Register'
              )
            }
          >
            <Download size={16} />
            Export Register PDF
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreateModal(true); }}>
            <Plus size={16} />
            Create New Invoice
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL INVOICED</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>GHS {fmt(totalInvoiced)}</h2>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Gross, excluding voided invoices</p>
        </div>
        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>SETTLED</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#059669', marginTop: '4px' }}>GHS {fmt(totalSettled)}</h2>
          <p style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px' }}>
            {totalInvoiced > 0 ? ((totalSettled / totalInvoiced) * 100).toFixed(1) : '0.0'}% of invoiced (payments and credits)
          </p>
        </div>
        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>OUTSTANDING AR BALANCE</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: '4px' }}>GHS {fmt(totalOutstanding)}</h2>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Open receivables</p>
        </div>
        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>OVERDUE RECEIVABLES</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626', marginTop: '4px' }}>GHS {fmt(totalOverdue)}</h2>
          <p style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '4px' }}>Past due date with a balance</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => { setFilterStatus(st); setCurrentPage(1); }}
              className="btn btn-secondary"
              style={{
                borderColor: filterStatus === st ? 'var(--accent-primary)' : 'var(--border-color)',
                color: filterStatus === st ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: filterStatus === st ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
              }}
            >
              {st}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', width: '280px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search invoice # or client..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }}
          />
        </div>
      </div>

      <div className="card">
        {listError && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{listError}</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Due</th>
              <th>Customer / Client</th>
              <th style={{ textAlign: 'right' }}>Net (GHS)</th>
              <th style={{ textAlign: 'right' }}>Levies (GHS)</th>
              <th style={{ textAlign: 'right' }}>Gross (GHS)</th>
              <th style={{ textAlign: 'right' }}>Balance Due</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingList && (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
            )}
            {!loadingList && paginatedInvoices.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found.</td></tr>
            )}
            {paginatedInvoices.map((inv) => {
              const levies = Number(inv.VatAmount) + Number(inv.NhisAmount) + Number(inv.GetfundAmount);
              const overdue = isOverdue(inv);
              return (
                <tr key={inv.Id}>
                  <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{inv.InvoiceNumber}</td>
                  <td>{day(inv.InvoiceDate)}</td>
                  <td>{day(inv.DueDate)}</td>
                  <td style={{ fontWeight: '600' }}>{inv.ClientName || `Client #${inv.ClientId}`}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(inv.SubTotal)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(levies)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>{fmt(inv.TotalAmount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(inv.BalanceDue)}</td>
                  <td>
                    <span className={`badge ${
                      inv.Status === 'PAID' ? 'badge-success' :
                      inv.Status === 'VOID' ? 'badge-danger' :
                      overdue ? 'badge-danger' :
                      inv.Status === 'PARTIAL' ? 'badge-warning' : 'badge-info'
                    }`}>
                      {overdue ? 'OVERDUE' : inv.Status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => openInvoice(inv)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                      <Eye size={12} />
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {showCreateModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Create Sales Invoice</h2>

            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer / Client</label>
                  <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ ...inputStyle, width: '100%', padding: '9px' }} required>
                    <option value="">Select a client…</option>
                    {clients.map((c) => (
                      <option key={c.Id} value={c.Id}>{c.Name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Due date (default 30 days)</label>
                  <input type="date" value={dueDate} min={todayIso()} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Line items</label>
                  <button type="button" className="btn btn-secondary" onClick={handleAddLineItem} style={{ padding: '4px 8px', fontSize: '11.5px' }}>
                    + Add Item Row
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lineItems.map((item) => (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr auto', gap: '8px' }}>
                      <input type="text" placeholder="Item Description" maxLength={500} value={item.description} onChange={(e) => handleLineChange(item.id, 'description', e.target.value)} style={inputStyle} required />
                      <input type="number" placeholder="Qty" min="0.0001" step="any" value={item.qty || ''} onChange={(e) => handleLineChange(item.id, 'qty', parseFloat(e.target.value) || 0)} style={inputStyle} required />
                      <input type="number" step="0.01" min="0" placeholder="Unit Price (GHS)" value={item.unitPrice || ''} onChange={(e) => handleLineChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} style={inputStyle} required />
                      <button type="button" className="btn btn-secondary" onClick={() => handleRemoveLineItem(item.id)} disabled={lineItems.length === 1} style={{ padding: '4px 8px' }} title="Remove row">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Net Subtotal:</span><span style={{ fontWeight: '600' }}>GHS {fmt(netTotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}><span>+ VAT (15%):</span><span>GHS {fmt(vatTotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}><span>+ NHIL (2.5%):</span><span>GHS {fmt(nhisTotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}><span>+ GETFund (2.5%):</span><span>GHS {fmt(getfundTotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontWeight: '700', fontSize: '14px' }}><span>TOTAL:</span><span>GHS {fmt(grossTotal)}</span></div>
              </div>

              {errorMsg && <p style={{ color: '#dc2626', fontSize: '13px' }}>{errorMsg}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !clientId || netTotal <= 0}>
                  {saving ? 'Posting…' : 'Post Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card printable-invoice" style={{ width: '720px', padding: '36px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-primary)' }}>GHANA PUBLISHING COMPANY LTD</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assembly Press, Barnes Road, Accra | TIN: C0014892014</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{selectedInvoice.Status === 'VOID' ? 'VOIDED INVOICE' : 'TAX INVOICE'}</h3>
                <p style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: '700' }}>{selectedInvoice.InvoiceNumber}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date: {day(selectedInvoice.InvoiceDate)} · Due: {day(selectedInvoice.DueDate)}</p>
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>BILLED TO:</p>
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>{selectedInvoice.ClientName}</h4>
            </div>

            <table className="data-table" style={{ marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price (GHS)</th>
                  <th style={{ textAlign: 'right' }}>Total (GHS)</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.lines.length === 0 && (
                  <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>Line items were not recorded for this invoice.</td></tr>
                )}
                {selectedInvoice.lines.map((l) => (
                  <tr key={l.LineNumber}>
                    <td style={{ fontWeight: '500' }}>{l.Description}</td>
                    <td style={{ textAlign: 'center' }}>{Number(l.Quantity)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(l.UnitPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(l.LineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', width: '300px', marginLeft: 'auto', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Net Subtotal:</span><span>GHS {fmt(selectedInvoice.SubTotal)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}><span>VAT (15%):</span><span>GHS {fmt(selectedInvoice.VatAmount)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}><span>NHIL (2.5%):</span><span>GHS {fmt(selectedInvoice.NhisAmount)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}><span>GETFund (2.5%):</span><span>GHS {fmt(selectedInvoice.GetfundAmount)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border-color)', paddingTop: '8px', fontWeight: '700', fontSize: '15px' }}><span>GROSS AMOUNT:</span><span>GHS {fmt(selectedInvoice.TotalAmount)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}><span>BALANCE DUE:</span><span>GHS {fmt(selectedInvoice.BalanceDue)}</span></div>
            </div>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {selectedInvoice.Status === 'UNPAID' && (
                <button className="btn btn-secondary" onClick={() => handleVoidInvoice(selectedInvoice)} style={{ color: '#dc2626', marginRight: 'auto' }}>
                  <Ban size={15} />
                  Void Invoice
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>Close</button>
              <button className="btn btn-secondary" onClick={() => handleExportSinglePdf(selectedInvoice)}>
                <Download size={15} color="#dc2626" />
                Download PDF
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={15} />
                Print A4
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
