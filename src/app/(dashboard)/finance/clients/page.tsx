'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Edit2, Power } from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import { api, errMsg, fmt } from '@/lib/clientApi';

interface Client {
  Id: number;
  Name: string;
  Email: string | null;
  Phone: string | null;
  Address: string | null;
  CreditLimit: number | null;
  TaxId: string | null;
  IsActive: boolean;
  OutstandingBalance: number;
  OpenInvoices: number;
}

type Form = { name: string; email: string; phone: string; address: string; taxId: string; creditLimit: string };
const emptyForm: Form = { name: '', email: '', phone: '', address: '', taxId: '', creditLimit: '' };
const FILTERS = ['ACTIVE', 'INACTIVE', 'ALL'] as const;

const inputStyle = { width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' };
const labelStyle = { fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' } as const;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [editing, setEditing] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ clients: Client[] }>('/api/v1/clients?take=1000&includeInactive=1');
      setClients(data.clients);
    } catch (e) {
      setError(errMsg(e, 'Failed to load customers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      name: c.Name,
      email: c.Email ?? '',
      phone: c.Phone ?? '',
      address: c.Address ?? '',
      taxId: c.TaxId ?? '',
      creditLimit: c.CreditLimit == null ? '' : String(c.CreditLimit),
    });
    setFormError('');
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const limit = form.creditLimit.trim();
    if (limit && !(Number(limit) >= 0)) {
      setFormError('Credit limit must be a positive amount, or blank for no limit.');
      return;
    }
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      taxId: form.taxId.trim(),
      creditLimit: limit ? Math.round(Number(limit) * 100) / 100 : null,
    };
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/v1/clients/${editing.Id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await api('/api/v1/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== ''))),
        });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(errMsg(err, 'Failed to save customer'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Client) => {
    if (c.IsActive) {
      const warn = Number(c.OutstandingBalance) > 0
        ? `\n\n${c.Name} still owes GHS ${fmt(c.OutstandingBalance)}. Existing invoices and payments are kept, but no new invoices can be raised for an inactive customer.`
        : '';
      if (!confirm(`Deactivate ${c.Name}?${warn}`)) return;
    }
    try {
      await api(`/api/v1/clients/${c.Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !c.IsActive }),
      });
      await load();
    } catch (e) {
      alert(errMsg(e, 'Update failed'));
    }
  };

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        (filter === 'ALL' || (filter === 'ACTIVE') === Boolean(c.IsActive)) &&
        [c.Name, c.Email, c.Phone, c.TaxId].some((v) => (v || '').toLowerCase().includes(t))
    );
  }, [clients, filter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const active = clients.filter((c) => c.IsActive);
  const totalOutstanding = active.reduce((s, c) => s + Number(c.OutstandingBalance), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Customers</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Customer records used for invoicing and receipts, with what each customer currently owes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /></button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} />
            New Customer
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div className="card">
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>ACTIVE CUSTOMERS</p>
          <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{active.length}</h2>
        </div>
        <div className="card">
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>OUTSTANDING (ACTIVE CUSTOMERS)</p>
          <h2 style={{ fontSize: '22px', fontWeight: 700 }}>GHS {fmt(totalOutstanding)}</h2>
        </div>
        <div className="card">
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>INACTIVE CUSTOMERS</p>
          <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{clients.length - active.length}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => { setFilter(f); setCurrentPage(1); }}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search name, email, phone or TIN..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '14px' }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {error && <p style={{ color: '#dc2626', fontSize: '13px', padding: '12px 16px' }}>{error}</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th>Phone</th>
              <th>TIN</th>
              <th style={{ textAlign: 'right' }}>Credit limit (GHS)</th>
              <th style={{ textAlign: 'right' }}>Outstanding (GHS)</th>
              <th style={{ textAlign: 'center' }}>Open invoices</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>}
            {!loading && paginated.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No customers found.</td></tr>}
            {paginated.map((c) => (
              <tr key={c.Id}>
                <td style={{ fontWeight: 600 }}>{c.Name}</td>
                <td>{c.Email || '—'}</td>
                <td>{c.Phone || '—'}</td>
                <td style={{ fontFamily: 'monospace' }}>{c.TaxId || '—'}</td>
                <td style={{ textAlign: 'right' }}>{c.CreditLimit == null ? 'No limit' : fmt(c.CreditLimit)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.OutstandingBalance)}</td>
                <td style={{ textAlign: 'center' }}>{c.OpenInvoices}</td>
                <td><span className={`badge ${c.IsActive ? 'badge-success' : 'badge-danger'}`}>{c.IsActive ? 'ACTIVE' : 'INACTIVE'}</span></td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => openEdit(c)} title="Edit customer">
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => toggleActive(c)} title={c.IsActive ? 'Deactivate' : 'Reactivate'}>
                    <Power size={12} />
                    {c.IsActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={save} className="card" style={{ width: '520px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{editing ? `Edit ${editing.Name}` : 'New customer'}</h2>
            <div>
              <label style={labelStyle}>Customer name *</label>
              <input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <input maxLength={255} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>GRA TIN</label>
                <input maxLength={50} value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={labelStyle}>Credit limit (GHS, blank = no limit)</label>
                <input type="number" min="0" step="0.01" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} style={inputStyle} />
              </div>
            </div>
            {formError && <p style={{ color: '#dc2626', fontSize: '13px' }}>{formError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create customer'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
