'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Download, Eye, CreditCard, CheckCircle2, Clock, Landmark, Printer, FileText } from 'lucide-react';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import Pagination from '@/components/ui/pagination';

interface PaymentItem {
  payNo: string;
  date: string;
  client: string;
  method: 'BANK_TRANSFER' | 'CHEQUE' | 'MOMO' | 'CASH';
  ref: string;
  bankAccount: string;
  amount: number;
  invRef: string;
  cleared: boolean;
}

const initialPayments: PaymentItem[] = [
  { payNo: 'PAY-2026-000412', date: '2026-09-01', client: 'Ghana Publishing Client A', method: 'BANK_TRANSFER', ref: 'TRF-994102', bankAccount: 'GCB Bank (1002)', amount: 10000.00, invRef: 'INV-2026-001054', cleared: true },
  { payNo: 'PAY-2026-000411', date: '2026-08-28', client: 'Ministry of Information', method: 'CHEQUE', ref: 'CHQ-001284', bankAccount: 'GCB Bank (1002)', amount: 48000.00, invRef: 'INV-2026-001053', cleared: true },
  { payNo: 'PAY-2026-000410', date: '2026-08-25', client: 'State Transport Corporation', method: 'MOMO', ref: 'MM-884129', bankAccount: 'Ecobank (1003)', amount: 15000.00, invRef: 'INV-2026-001050', cleared: true },
  { payNo: 'PAY-2026-000409', date: '2026-08-20', client: 'Ministry of Education', method: 'CHEQUE', ref: 'CHQ-009941', bankAccount: 'GCB Bank (1002)', amount: 25000.00, invRef: 'INV-2026-001058', cleared: false },
  { payNo: 'PAY-2026-000408', date: '2026-08-15', client: 'Ghana Publishing Client A', method: 'CASH', ref: 'CSH-00142', bankAccount: 'Main Cash (1001)', amount: 5000.00, invRef: 'INV-2026-001054', cleared: true },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>(initialPayments);
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterCleared, setFilterCleared] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);

  // Form State
  const [client, setClient] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'BANK_TRANSFER' | 'CHEQUE' | 'MOMO' | 'CASH'>('BANK_TRANSFER');
  const [ref, setRef] = useState('');
  const [bankAccount, setBankAccount] = useState('GCB Bank (1002)');
  const [invRef, setInvRef] = useState('INV-2026-001054');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || amount <= 0) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `PAY-${Date.now()}`,
        },
        body: JSON.stringify({
          clientId: 1,
          amount: Number(amount),
          paymentMethod: method,
          reference: ref || `REF-${Date.now()}`,
          paymentDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status === 'ERROR') {
        setErrorMsg(data.message || 'Failed to record payment');
        alert(data.message || 'Payment failed');
        setLoading(false);
        return;
      }

      const newPay: PaymentItem = {
        payNo: data.paymentNumber,
        date: new Date().toISOString().slice(0, 10),
        client,
        method,
        ref: ref || 'N/A',
        bankAccount,
        amount: Number(amount),
        invRef: invRef || 'UNALLOCATED',
        cleared: method === 'CASH' || method === 'BANK_TRANSFER',
      };

      setPayments([newPay, ...payments]);
      setClient('');
      setAmount(0);
      setRef('');
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClearance = (payNo: string) => {
    setPayments(payments.map(p => p.payNo === payNo ? { ...p, cleared: !p.cleared } : p));
  };

  const filtered = payments.filter(p => {
    const matchesMethod = filterMethod === 'ALL' || p.method === filterMethod;
    const matchesCleared = filterCleared === 'ALL' || (filterCleared === 'CLEARED' ? p.cleared : !p.cleared);
    const matchesSearch = p.payNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.ref.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMethod && matchesCleared && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const clearedTotal = payments.filter(p => p.cleared).reduce((sum, p) => sum + p.amount, 0);
  const pendingTotal = payments.filter(p => !p.cleared).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      {/* Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Customer Payments & AR Settlement Hub</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Record payment receipts, allocate settlements against open invoices, manage cheque clearance, and generate official receipts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => exportToPdf('CUSTOMER PAYMENTS & SETTLEMENT REGISTER', [
            { header: 'Payment #', key: 'payNo' },
            { header: 'Date', key: 'date' },
            { header: 'Customer', key: 'client' },
            { header: 'Method', key: 'method' },
            { header: 'Reference', key: 'ref' },
            { header: 'Amount (GHS)', key: 'amount' },
            { header: 'Invoice Ref', key: 'invRef' },
          ], payments, 'Customer_Payments_Register')}>
            <Download size={16} />
            Export Payments PDF
          </button>

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Record Payment Receipt
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL RECEIPTS COLLECTED</p>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#059669', marginTop: '4px' }}>
            GHS {totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h2>
          <p style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px' }}>All payment methods combined</p>
        </div>

        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>BANK CLEARED FUNDS</p>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: '4px' }}>
            GHS {clearedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h2>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Verified bank deposits</p>
        </div>

        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>PENDING CHEQUE CLEARANCE</p>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-warning)', marginTop: '4px' }}>
            GHS {pendingTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h2>
          <p style={{ fontSize: '11.5px', color: 'var(--accent-warning)', marginTop: '4px' }}>Uncleared bank cheques</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'BANK_TRANSFER', 'CHEQUE', 'MOMO', 'CASH'].map(m => (
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
              {m}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 14px', width: '300px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search payment #, client, or ref..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Payment Receipts Register Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Payment #</th>
              <th>Date</th>
              <th>Customer / Client Name</th>
              <th>Method</th>
              <th>Reference / Cheque #</th>
              <th>Target Bank Account</th>
              <th>Settled Invoice</th>
              <th style={{ textAlign: 'right' }}>Amount Paid (GHS)</th>
              <th>Bank Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(p => (
              <tr key={p.payNo}>
                <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{p.payNo}</td>
                <td>{p.date}</td>
                <td style={{ fontWeight: '600' }}>{p.client}</td>
                <td><span className="badge badge-info">{p.method}</span></td>
                <td>{p.ref}</td>
                <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{p.bankAccount}</td>
                <td style={{ fontFamily: 'monospace' }}>{p.invRef}</td>
                <td style={{ textAlign: 'right', fontWeight: '700', color: '#059669' }}>GHS {p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>
                  <span className={`badge ${p.cleared ? 'badge-success' : 'badge-warning'}`}>
                    {p.cleared ? 'CLEARED' : 'PENDING'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setSelectedPayment(p)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11.5px' }}
                    >
                      <Eye size={12} />
                      Receipt
                    </button>

                    <button
                      onClick={() => handleToggleClearance(p.payNo)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11.5px' }}
                    >
                      {p.cleared ? 'Unclear' : 'Clear Bank'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={p => setCurrentPage(p)}
        />
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div className="card" style={{ width: '500px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Record Customer Payment Receipt</h2>
            
            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer / Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ministry of Communications"
                  value={client}
                  onChange={e => setClient(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Amount Paid (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Target Deposit Account</label>
                  <select
                    value={bankAccount}
                    onChange={e => setBankAccount(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="GCB Bank (1002)">GCB Bank - Operating (1002)</option>
                    <option value="Ecobank (1003)">Ecobank - Operational (1003)</option>
                    <option value="Main Cash (1001)">Main Cash Account (1001)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Payment Method</label>
                  <select
                    value={method}
                    onChange={e => setMethod(e.target.value as any)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (GCB/Ecobank)</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="MOMO">Mobile Money (MoMo)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Reference / Cheque #</label>
                  <input
                    type="text"
                    placeholder="TRF-9901 / CHQ-001"
                    value={ref}
                    onChange={e => setRef(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Settled Invoice Number</label>
                <select
                  value={invRef}
                  onChange={e => setInvRef(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                >
                  <option value="INV-2026-001054">INV-2026-001054 (Ghana Publishing Client A - Due: GHS 17,000.00)</option>
                  <option value="INV-2026-001050">INV-2026-001050 (State Transport Corp - Due: GHS 37,000.00)</option>
                  <option value="INV-2026-001058">INV-2026-001058 (Ministry of Education - Due: GHS 66,000.00)</option>
                  <option value="UNALLOCATED">Unallocated Prepayment Deposit</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Record Payment & Post GL</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Payment Receipt Modal Viewer */}
      {selectedPayment && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div className="card printable-invoice" style={{ width: '600px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-primary)' }}>GHANA PUBLISHING COMPANY LTD</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assembly Press, Barnes Road, Accra | TIN: C0014892014</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>OFFICIAL RECEIPT</h3>
                <p style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: '700' }}>{selectedPayment.payNo}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date: {selectedPayment.date}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>RECEIVED FROM:</span>
                <span style={{ fontWeight: '700' }}>{selectedPayment.client}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>AMOUNT RECEIVED:</span>
                <span style={{ fontWeight: '700', fontSize: '16px', color: '#059669' }}>GHS {selectedPayment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>PAYMENT METHOD & REF:</span>
                <span style={{ fontWeight: '600' }}>{selectedPayment.method} ({selectedPayment.ref})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>DEPOSIT BANK ACCOUNT:</span>
                <span>{selectedPayment.bankAccount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>SETTLED INVOICE:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{selectedPayment.invRef}</span>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedPayment(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={15} />
                Print Official Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
