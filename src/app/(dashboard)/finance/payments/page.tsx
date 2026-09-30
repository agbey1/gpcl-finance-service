'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Download, Eye, Printer, RefreshCw } from 'lucide-react';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import Pagination from '@/components/ui/pagination';
import { api, day, fmt, newKey, todayIso } from '@/lib/clientApi';

type Method = 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_MONEY' | 'CASH';

const METHOD_LABELS: Record<Method, string> = {
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  MOBILE_MONEY: 'Mobile Money',
  CASH: 'Cash',
};

interface PaymentRow {
  Id: number;
  PaymentNumber: string;
  ClientId: number;
  ClientName: string | null;
  InvoiceId: number | null;
  InvoiceNumber: string | null;
  PaymentDate: string;
  Amount: number;
  PaymentMethod: Method;
  Reference: string | null;
}

interface Client {
  Id: number;
  Name: string;
}

interface OpenInvoice {
  Id: number;
  InvoiceNumber: string;
  ClientId: number;
  BalanceDue: number;
  Status: string;
}


export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [filterMethod, setFilterMethod] = useState<'ALL' | Method>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);

  // Form state
  const [clientId, setClientId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Method>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitKey, setSubmitKey] = useState(newKey);

  const load = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const [pay, cl, unpaid, partial] = await Promise.all([
        api<{ payments: PaymentRow[] }>('/api/v1/payments/query?take=200'),
        api<{ clients: Client[] }>('/api/v1/clients?take=100'),
        api<{ invoices: OpenInvoice[] }>('/api/v1/invoices/query?status=UNPAID&take=200'),
        api<{ invoices: OpenInvoice[] }>('/api/v1/invoices/query?status=PARTIAL&take=200'),
      ]);
      setPayments(pay.payments);
      setClients(cl.clients);
      setOpenInvoices([...unpaid.invoices, ...partial.invoices]);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load payments');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    // Initial data load; state is set asynchronously after the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const clientInvoices = openInvoices.filter((i) => String(i.ClientId) === clientId);
  const selectedInvoice = clientInvoices.find((i) => String(i.Id) === invoiceId);
  const amountNum = Number(amount);
  const overpayment = selectedInvoice && amountNum > Number(selectedInvoice.BalanceDue)
    ? amountNum - Number(selectedInvoice.BalanceDue)
    : 0;

  const resetForm = () => {
    setClientId('');
    setInvoiceId('');
    setAmount('');
    setMethod('BANK_TRANSFER');
    setReference('');
    setPaymentDate(todayIso());
    setErrorMsg('');
    setSubmitKey(newKey());
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !(amountNum > 0) || saving) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await api('/api/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': submitKey },
        body: JSON.stringify({
          clientId: Number(clientId),
          invoiceId: invoiceId ? Number(invoiceId) : null,
          amount: Math.round(amountNum * 100) / 100,
          paymentMethod: method,
          reference: reference.trim() || null,
          paymentDate,
        }),
      });
      resetForm();
      setShowModal(false);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return payments.filter((p) => {
      const matchesMethod = filterMethod === 'ALL' || p.PaymentMethod === filterMethod;
      const matchesSearch =
        p.PaymentNumber.toLowerCase().includes(term) ||
        (p.ClientName || '').toLowerCase().includes(term) ||
        (p.Reference || '').toLowerCase().includes(term) ||
        (p.InvoiceNumber || '').toLowerCase().includes(term);
      return matchesMethod && matchesSearch;
    });
  }, [payments, filterMethod, searchTerm]);

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.Amount), 0);
  const allocated = payments.filter((p) => p.InvoiceId).reduce((sum, p) => sum + Number(p.Amount), 0);
  const unallocated = totalCollected - allocated;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportRows = filtered.map((p) => ({
    PaymentNumber: p.PaymentNumber,
    date: day(p.PaymentDate),
    ClientName: p.ClientName || '',
    method: METHOD_LABELS[p.PaymentMethod] || p.PaymentMethod,
    Reference: p.Reference || '',
    amount: fmt(p.Amount),
    InvoiceNumber: p.InvoiceNumber || 'Unallocated',
  }));
  const exportCols = [
    { header: 'Receipt #', key: 'PaymentNumber' },
    { header: 'Date', key: 'date' },
    { header: 'Customer', key: 'ClientName' },
    { header: 'Method', key: 'method' },
    { header: 'Reference', key: 'Reference' },
    { header: 'Amount (GHS)', key: 'amount' },
    { header: 'Invoice', key: 'InvoiceNumber' },
  ];

  const fieldStyle = { width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' };
  const labelStyle = { fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' } as const;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Customer Payments & Receipts</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Record payment receipts, allocate them against open invoices, and issue official receipts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loadingList}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-secondary" onClick={() => exportToExcel(exportRows, exportCols, 'Customer_Payments_Register')}>
            <Download size={16} />
            Excel
          </button>
          <button className="btn btn-secondary" onClick={() => exportToPdf('CUSTOMER PAYMENTS REGISTER', exportCols, exportRows, 'Customer_Payments_Register')}>
            <Download size={16} />
            PDF
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={16} />
            Record Payment
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL RECEIVED</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#059669', marginTop: '4px' }}>GHS {fmt(totalCollected)}</h2>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{payments.length} receipts loaded</p>
        </div>
        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>ALLOCATED TO INVOICES</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>GHS {fmt(allocated)}</h2>
        </div>
        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>UNALLOCATED</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#d97706', marginTop: '4px' }}>GHS {fmt(unallocated)}</h2>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Prepayments / on account</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'CASH'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setFilterMethod(m); setCurrentPage(1); }}
              className="btn btn-secondary"
              style={{
                borderColor: filterMethod === m ? 'var(--accent-primary)' : 'var(--border-color)',
                color: filterMethod === m ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: filterMethod === m ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
              }}
            >
              {m === 'ALL' ? 'ALL' : METHOD_LABELS[m]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', width: '300px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search receipt #, client, ref, invoice..."
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
              <th>Receipt #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Invoice</th>
              <th style={{ textAlign: 'right' }}>Amount (GHS)</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingList && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
            )}
            {!loadingList && paginated.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No payments found.</td></tr>
            )}
            {paginated.map((p) => (
              <tr key={p.Id}>
                <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{p.PaymentNumber}</td>
                <td>{day(p.PaymentDate)}</td>
                <td style={{ fontWeight: '600' }}>{p.ClientName || `Client #${p.ClientId}`}</td>
                <td>{METHOD_LABELS[p.PaymentMethod] || p.PaymentMethod}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.Reference || '—'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.InvoiceNumber || 'Unallocated'}</td>
                <td style={{ textAlign: 'right', fontWeight: '700' }}>{fmt(p.Amount)}</td>
                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => setSelectedPayment(p)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                    <Eye size={12} />
                    Receipt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>

      {showModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '520px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Record Customer Payment</h2>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Customer / Client</label>
                <select value={clientId} onChange={(e) => { setClientId(e.target.value); setInvoiceId(''); }} style={fieldStyle} required>
                  <option value="">Select a client…</option>
                  {clients.map((c) => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Apply to invoice</label>
                <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} style={fieldStyle} disabled={!clientId}>
                  <option value="">Unallocated (payment on account)</option>
                  {clientInvoices.map((i) => (
                    <option key={i.Id} value={i.Id}>{i.InvoiceNumber} — balance GHS {fmt(i.BalanceDue)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Amount (GHS)</label>
                  <input type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} style={fieldStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Payment date</label>
                  <input type="date" value={paymentDate} max={todayIso()} onChange={(e) => setPaymentDate(e.target.value)} style={fieldStyle} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Payment method</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value as Method)} style={fieldStyle}>
                    {(Object.keys(METHOD_LABELS) as Method[]).map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                  </select>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Posts to {method === 'BANK_TRANSFER' ? 'Bank (1002)' : 'Cash (1001)'}
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>Reference / Cheque #</label>
                  <input type="text" maxLength={100} placeholder="TRF-9901 / CHQ-001" value={reference} onChange={(e) => setReference(e.target.value)} style={fieldStyle} />
                </div>
              </div>

              {overpayment > 0 && (
                <p style={{ fontSize: '12.5px', color: '#d97706' }}>
                  Amount exceeds the invoice balance. GHS {fmt(overpayment)} will be held as an open credit note for this client.
                </p>
              )}
              {errorMsg && <p style={{ color: '#dc2626', fontSize: '13px' }}>{errorMsg}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !clientId || !(amountNum > 0)}>
                  {saving ? 'Posting…' : 'Record Payment & Post GL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPayment && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card printable-invoice" style={{ width: '600px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-primary)' }}>GHANA PUBLISHING COMPANY LTD</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assembly Press, Barnes Road, Accra | TIN: C0014892014</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>OFFICIAL RECEIPT</h3>
                <p style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: '700' }}>{selectedPayment.PaymentNumber}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date: {day(selectedPayment.PaymentDate)}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Received from:</span><span style={{ fontWeight: '700' }}>{selectedPayment.ClientName}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Payment method:</span><span>{METHOD_LABELS[selectedPayment.PaymentMethod] || selectedPayment.PaymentMethod}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Reference:</span><span style={{ fontFamily: 'monospace' }}>{selectedPayment.Reference || '—'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Applied to:</span><span style={{ fontFamily: 'monospace' }}>{selectedPayment.InvoiceNumber || 'On account'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border-color)', paddingTop: '10px', fontWeight: '700', fontSize: '18px' }}><span>AMOUNT RECEIVED:</span><span>GHS {fmt(selectedPayment.Amount)}</span></div>
            </div>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedPayment(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={15} />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
