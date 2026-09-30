'use client';

import { useState } from 'react';
import { Plus, Search, FileText, ArrowRightLeft, Check, RotateCcw } from 'lucide-react';
import Pagination from '@/components/ui/pagination';

interface Journal {
  entryNumber: string;
  date: string;
  module: string;
  ref: string;
  desc: string;
  debit: number;
  credit: number;
  status: 'POSTED' | 'REVERSED';
}

const initialJournals: Journal[] = [
  { entryNumber: 'JNL-2026-089412', date: '2026-09-01', module: 'STORE_GRN', ref: 'PO-88412', desc: 'GRN #GRN-2026-00142 - Paper Stock Delivery', debit: 15400.00, credit: 15400.00, status: 'POSTED' },
  { entryNumber: 'JNL-2026-089413', date: '2026-09-01', module: 'INVOICE', ref: 'INV-2026-001054', desc: 'Customer Invoice #INV-2026-001054', debit: 27000.00, credit: 27000.00, status: 'POSTED' },
  { entryNumber: 'JNL-2026-089414', date: '2026-09-01', module: 'PAYMENT', ref: 'PAY-2026-000412', desc: 'Customer Payment #PAY-2026-000412', debit: 10000.00, credit: 10000.00, status: 'POSTED' },
  { entryNumber: 'JNL-2026-089415', date: '2026-08-31', module: 'GAZETTE', ref: 'GZ-8814', desc: 'Gazette Notice Purchase Checkout', debit: 4500.00, credit: 4500.00, status: 'POSTED' },
  { entryNumber: 'JNL-2026-089416', date: '2026-08-30', module: 'STORE_ADJUSTMENT', ref: 'ADJ-102', desc: 'Store Damaged Stock Write-off', debit: 1200.00, credit: 1200.00, status: 'REVERSED' },
  { entryNumber: 'JNL-2026-089417', date: '2026-08-28', module: 'PAYROLL', ref: 'PAYROLL-AUG26', desc: 'Monthly Executive Payroll Disbursement', debit: 48750.00, credit: 48750.00, status: 'POSTED' },
  { entryNumber: 'JNL-2026-089418', date: '2026-08-25', module: 'BANK_FEE', ref: 'FEE-0826', desc: 'Bank Monthly Service Charge Adjustment', debit: 250.00, credit: 250.00, status: 'POSTED' },
];

export default function JournalEntriesPage() {
  const [journals, setJournals] = useState<Journal[]>(initialJournals);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [showModal, setShowModal] = useState(false);

  // Form State
  const [desc, setDesc] = useState('');
  const [ref, setRef] = useState('');
  const [amount, setAmount] = useState<number>(0);

  const handleReverse = (entryNumber: string) => {
    setJournals(journals.map(j => j.entryNumber === entryNumber ? { ...j, status: 'REVERSED' } : j));
  };

  const handleAddManualJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;

    const seq = String(journals.length + 89419).padStart(6, '0');
    const newJournal: Journal = {
      entryNumber: `JNL-2026-${seq}`,
      date: new Date().toISOString().slice(0, 10),
      module: 'MANUAL_JOURNAL',
      ref: ref || 'MANUAL',
      desc,
      debit: Number(amount),
      credit: Number(amount),
      status: 'POSTED',
    };

    setJournals([newJournal, ...journals]);
    setDesc('');
    setRef('');
    setAmount(0);
    setShowModal(false);
  };

  const filtered = journals.filter(j =>
    j.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Journal Entries & Ledger Audit</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Complete General Ledger journal entry register with double-entry reversal and audit trail.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          New Manual Journal Entry
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Search size={16} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Filter journals by Entry #, Source Module, or Description..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '14px' }}
        />
      </div>

      {/* Journal Entries Register */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Entry Number</th>
              <th>Date</th>
              <th>Source Module</th>
              <th>Reference</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Total Debits (GHS)</th>
              <th style={{ textAlign: 'right' }}>Total Credits (GHS)</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(j => (
              <tr key={j.entryNumber}>
                <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{j.entryNumber}</td>
                <td>{j.date}</td>
                <td><span className="badge badge-info">{j.module}</span></td>
                <td>{j.ref}</td>
                <td>{j.desc}</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>{j.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>{j.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>
                  <span className={`badge ${j.status === 'POSTED' ? 'badge-success' : 'badge-danger'}`}>
                    {j.status}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {j.status === 'POSTED' ? (
                    <button
                      onClick={() => handleReverse(j.entryNumber)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      <RotateCcw size={12} />
                      Reverse
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Reversed</span>
                  )}
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

      {/* New Manual Journal Modal */}
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
          <div className="card" style={{ width: '460px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Post Manual Journal Entry</h2>
            
            <form onSubmit={handleAddManualJournal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Journal Description / Narration</label>
                <input
                  type="text"
                  placeholder="e.g. Month-end Accrual Adjustment"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Reference Number</label>
                <input
                  type="text"
                  placeholder="e.g. MEMO-991"
                  value={ref}
                  onChange={e => setRef(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Journal Amount (GHS)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount || ''}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Post Manual Journal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
