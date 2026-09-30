'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, Check, X, RefreshCw } from 'lucide-react';

interface StatementTx {
  id: number;
  date: string;
  narration: string;
  debit: number;
  credit: number;
  status: 'CLEARED' | 'UNMATCHED' | 'DISPUTED';
  matchedPaymentRef: string;
}

const bankAccountMap: Record<string, number> = {
  'GCB Bank - Operating Account': 1002,
  'Ecobank - Operational Account': 1003,
};

export default function BankReconciliationsPage() {
  const [selectedBank, setSelectedBank] = useState('GCB Bank - Operating Account');
  const [transactions, setTransactions] = useState<StatementTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const bankAccountId = bankAccountMap[selectedBank] || 1002;

  useEffect(() => {
    fetchTransactions();
  }, [selectedBank]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gpcl_token');
      const res = await fetch(`/api/v1/reconciliation/bank-accounts/${bankAccountId}/transactions`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch bank transactions:', err);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a CSV file to upload.');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('gpcl_token');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`/api/v1/reconciliation/bank-accounts/${bankAccountId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadNotice(
          `Bank Statement "${selectedFile.name}" ingested into DB! ${data.autoMatchedCount || 0} matched, ${data.unmatchedCount || 0} unmatched.`
        );
        setShowUploadModal(false);
        setSelectedFile(null);
        fetchTransactions();
      } else {
        alert(data.message || 'Failed to upload statement');
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    }
    setUploading(false);
  };

  const handleResolveVariance = async (id: number) => {
    try {
      const token = localStorage.getItem('gpcl_token');
      const res = await fetch(`/api/v1/reconciliation/transactions/${id}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
      });

      if (res.ok) {
        setTransactions(transactions.map(t => t.id === id ? { ...t, status: 'CLEARED', matchedPaymentRef: 'VARIANCE-RESOLVED' } : t));
      } else {
        alert('Failed to resolve variance');
      }
    } catch (err) {
      console.error('Error resolving variance:', err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Bank Reconciliation Workspace</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Upload CSV statements, auto-match transactions against General Ledger payments, and resolve statement variances.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchTransactions} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            <Upload size={16} />
            Upload CSV Statement
          </button>
        </div>
      </div>

      {uploadNotice && (
        <div style={{ padding: '12px 16px', background: 'rgba(5, 150, 105, 0.1)', border: '1px solid #059669', borderRadius: '8px', color: '#059669', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{uploadNotice}</span>
          </div>
          <X size={16} style={{ cursor: 'pointer' }} onClick={() => setUploadNotice(null)} />
        </div>
      )}

      {/* Account Select Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        <div
          className="card"
          style={{
            borderColor: selectedBank === 'GCB Bank - Operating Account' ? 'var(--accent-primary)' : 'var(--border-color)',
            cursor: 'pointer',
          }}
          onClick={() => setSelectedBank('GCB Bank - Operating Account')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>ACCOUNT 1002</p>
              <h3 style={{ fontSize: '18px', marginTop: '2px' }}>GCB Bank - Operating Account</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Acc #: 114100984210</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>GL Balance</p>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>GHS 185,400.00</p>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            borderColor: selectedBank === 'Ecobank - Operational Account' ? 'var(--accent-primary)' : 'var(--border-color)',
            cursor: 'pointer',
          }}
          onClick={() => setSelectedBank('Ecobank - Operational Account')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>ACCOUNT 1003</p>
              <h3 style={{ fontSize: '18px', marginTop: '2px' }}>Ecobank - Operational Account</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Acc #: 144100298319</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>GL Balance</p>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>GHS 92,100.00</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reconciliation Matching Workbench */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Statement Matching Workbench</h3>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading statement transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FileSpreadsheet size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p>No statement transactions uploaded yet for {selectedBank}.</p>
            <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setShowUploadModal(true)}>
              Upload First Statement CSV
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Txn Date</th>
                <th>Bank Statement Narration</th>
                <th style={{ textAlign: 'right' }}>Debit (GHS)</th>
                <th style={{ textAlign: 'right' }}>Credit (GHS)</th>
                <th>Matching Status</th>
                <th>Matched GL Reference</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td style={{ fontWeight: '500' }}>{t.narration}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>{t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>{t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
                  <td>
                    <span className={`badge ${t.status === 'CLEARED' ? 'badge-success' : 'badge-warning'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{t.matchedPaymentRef}</td>
                  <td style={{ textAlign: 'center' }}>
                    {t.status === 'UNMATCHED' ? (
                      <button
                        onClick={() => handleResolveVariance(t.id)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        Resolve Variance
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>✓ Matched</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
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
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Upload Bank Statement CSV</h2>

            <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Select Target Bank Account</label>
                <select
                  value={selectedBank}
                  onChange={e => setSelectedBank(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="GCB Bank - Operating Account">GCB Bank - Operating Account (1002)</option>
                  <option value="Ecobank - Operational Account">Ecobank - Operational Account (1003)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Choose CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)} disabled={uploading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Ingesting & Matching...' : 'Ingest & Auto-Match Statement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
