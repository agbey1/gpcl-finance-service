'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Download, Eye, FileText, CheckCircle2, AlertTriangle, Clock, RefreshCw, Printer } from 'lucide-react';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import Pagination from '@/components/ui/pagination';

interface LineItem {
  id: number;
  description: string;
  qty: number;
  unitPrice: number;
}

interface Invoice {
  invNo: string;
  date: string;
  client: string;
  items: LineItem[];
  netAmount: number;
  vatAmount: number;
  nhisAmount: number;
  getfundAmount: number;
  grossAmount: number;
  paidAmount: number;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'DRAFT';
  isRecurring: boolean;
  recurringFrequency?: string;
}

const initialInvoices: Invoice[] = [
  {
    invNo: 'INV-2026-001054',
    date: '2026-09-01',
    client: 'Ghana Publishing Client A',
    items: [
      { id: 1, description: 'Commercial Printing - 5,000 Copies Gazette Manual', qty: 5000, unitPrice: 4.50 },
    ],
    netAmount: 22500.00,
    vatAmount: 3375.00,
    nhisAmount: 562.50,
    getfundAmount: 562.50,
    grossAmount: 27000.00,
    paidAmount: 10000.00,
    status: 'PARTIAL',
    isRecurring: false,
  },
  {
    invNo: 'INV-2026-001053',
    date: '2026-08-20',
    client: 'Ministry of Information',
    items: [
      { id: 1, description: 'Statutory Publishing & Annual Report Production', qty: 1000, unitPrice: 40.00 },
    ],
    netAmount: 40000.00,
    vatAmount: 6000.00,
    nhisAmount: 1000.00,
    getfundAmount: 1000.00,
    grossAmount: 48000.00,
    paidAmount: 48000.00,
    status: 'PAID',
    isRecurring: true,
    recurringFrequency: 'MONTHLY',
  },
  {
    invNo: 'INV-2026-001050',
    date: '2026-07-15',
    client: 'State Transport Corporation',
    items: [
      { id: 1, description: 'Custom Ticket Rolls & Logbook Printing', qty: 10000, unitPrice: 11.416 },
    ],
    netAmount: 114166.67,
    vatAmount: 17125.00,
    nhisAmount: 2854.17,
    getfundAmount: 2854.17,
    grossAmount: 137000.00,
    paidAmount: 100000.00,
    status: 'OVERDUE',
    isRecurring: false,
  },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form State for New Invoice
  const [client, setClient] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 1, description: '', qty: 1, unitPrice: 0 }
  ]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('MONTHLY');

  // Math Calculations for Form
  const netTotal = lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const vatTotal = netTotal * 0.15;
  const nhisTotal = netTotal * 0.025;
  const getfundTotal = netTotal * 0.025;
  const grossTotal = netTotal + vatTotal + nhisTotal + getfundTotal;

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { id: lineItems.length + 1, description: '', qty: 1, unitPrice: 0 }]);
  };

  const handleLineChange = (id: number, field: keyof LineItem, val: any) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || netTotal <= 0) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: 1,
          lineItems: lineItems.map(i => ({ description: i.description, quantity: i.qty, unitPrice: i.unitPrice })),
          applyGhanaLevies: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status === 'ERROR') {
        setErrorMsg(data.message || 'Failed to create invoice');
        setLoading(false);
        return;
      }

      const newInv: Invoice = {
        invNo: data.invoiceNumber,
        date: new Date().toISOString().slice(0, 10),
        client,
        items: lineItems,
        netAmount: data.subTotal,
        vatAmount: data.vatAmount,
        nhisAmount: data.nhisAmount,
        getfundAmount: data.getfundAmount,
        grossAmount: data.totalAmount,
        paidAmount: 0,
        status: 'DRAFT',
        isRecurring,
        recurringFrequency: isRecurring ? frequency : undefined,
      };

      setInvoices([newInv, ...invoices]);
      setClient('');
      setLineItems([{ id: 1, description: '', qty: 1, unitPrice: 0 }]);
      setIsRecurring(false);
      setShowCreateModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVoidInvoice = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to void ${invoice.invNo}? This will generate a reversing General Ledger entry.`)) return;
    try {
      const res = await fetch(`/api/v1/invoices/1/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Voided from Accounts Receivable UI' }),
      });
      const data = await res.json();
      if (res.ok) {
        setInvoices(invoices.map(inv => inv.invNo === invoice.invNo ? { ...inv, status: 'DRAFT' } : inv));
        alert(`Invoice ${invoice.invNo} voided successfully.`);
      }
    } catch (e) {}
  };

  const handleExportSinglePdf = (inv: Invoice) => {
    const pdfData = inv.items.map(item => ({
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice.toFixed(2),
      total: (item.qty * item.unitPrice).toFixed(2),
    }));

    exportToPdf(
      `COMMERCIAL INVOICE ${inv.invNo} - BILLED TO: ${inv.client.toUpperCase()}`,
      [
        { header: 'Item Description', key: 'description' },
        { header: 'Qty', key: 'qty' },
        { header: 'Unit Price (GHS)', key: 'unitPrice' },
        { header: 'Total Price (GHS)', key: 'total' },
      ],
      pdfData,
      `Invoice_${inv.invNo}`
    );
  };

  const filtered = invoices.filter(inv => {
    const matchesStatus = filterStatus === 'ALL' || inv.status === filterStatus;
    const matchesSearch = inv.invNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.client.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.grossAmount, 0);
  const totalCollected = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalOutstanding = totalInvoiced - totalCollected;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedInvoices = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Invoicing & Accounts Receivable (AR)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Generate customer invoices with Ghana levies (15% VAT, 2.5% NHIL, 2.5% GETFund), manage AR exposure, and track recurring schedules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => exportToPdf('INVOICES & ACCOUNTS RECEIVABLE REGISTER', [
            { header: 'Invoice #', key: 'invNo' },
            { header: 'Date', key: 'date' },
            { header: 'Customer', key: 'client' },
            { header: 'Net Amount', key: 'netAmount' },
            { header: 'Gross Amount', key: 'grossAmount' },
            { header: 'Paid Amount', key: 'paidAmount' },
            { header: 'Status', key: 'status' },
          ], invoices, 'Invoices_Register')}>
            <Download size={16} />
            Export Register PDF
          </button>

          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Create New Invoice
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL INVOICED</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>GHS {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Gross total including levies</p>
        </div>

        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>CASH COLLECTED</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#059669', marginTop: '4px' }}>GHS {totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
          <p style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px' }}>{((totalCollected / totalInvoiced) * 100).toFixed(1)}% Collection Rate</p>
        </div>

        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>OUTSTANDING AR BALANCE</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: '4px' }}>GHS {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Open Receivables</p>
        </div>

        <div className="card">
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>OVERDUE RECEIVABLES</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626', marginTop: '4px' }}>GHS 37,000.00</h2>
          <p style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '4px' }}>High Risk AR &gt; 90 days</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'PAID', 'PARTIAL', 'OVERDUE', 'DRAFT'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 14px', width: '300px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search invoice # or client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Invoices Register Table */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer / Client</th>
              <th style={{ textAlign: 'right' }}>Net Price (GHS)</th>
              <th style={{ textAlign: 'right' }}>Ghana Levies (20%)</th>
              <th style={{ textAlign: 'right' }}>Gross Total (GHS)</th>
              <th style={{ textAlign: 'right' }}>Amount Paid</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedInvoices.map(inv => {
              const levies = inv.vatAmount + inv.nhisAmount + inv.getfundAmount;
              return (
                <tr key={inv.invNo}>
                  <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                    {inv.invNo}
                    {inv.isRecurring && <span className="badge badge-info" style={{ marginLeft: '6px', fontSize: '10px' }}>{inv.recurringFrequency}</span>}
                  </td>
                  <td>{inv.date}</td>
                  <td style={{ fontWeight: '600' }}>{inv.client}</td>
                  <td style={{ textAlign: 'right' }}>{inv.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{levies.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>GHS {inv.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600', color: '#059669' }}>GHS {inv.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`badge ${
                      inv.status === 'PAID' ? 'badge-success' :
                      inv.status === 'PARTIAL' ? 'badge-warning' :
                      inv.status === 'OVERDUE' ? 'badge-danger' : 'badge-info'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      <Eye size={12} />
                      View Invoice
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

      {/* Create New Invoice Modal */}
      {showCreateModal && (
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
          <div className="card" style={{ width: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Create Commercial Sales Invoice</h2>
            
            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

              {/* Itemized Line Items */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Itemized Printing / Sales Items</label>
                  <button type="button" className="btn btn-secondary" onClick={handleAddLineItem} style={{ padding: '4px 8px', fontSize: '11.5px' }}>
                    + Add Item Row
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lineItems.map(item => (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Item Description"
                        value={item.description}
                        onChange={e => handleLineChange(item.id, 'description', e.target.value)}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.qty || ''}
                        onChange={e => handleLineChange(item.id, 'qty', parseInt(e.target.value) || 0)}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Unit Price (GHS)"
                        value={item.unitPrice || ''}
                        onChange={e => handleLineChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Ghana Statutory Tax Breakdown Summary */}
              <div style={{ padding: '14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Net Subtotal:</span>
                  <span style={{ fontWeight: '600' }}>GHS {netTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>+ Value Added Tax (VAT 15%):</span>
                  <span>GHS {vatTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>+ NHIL Levy (2.5%):</span>
                  <span>GHS {nhisTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>+ GETFund Levy (2.5%):</span>
                  <span>GHS {getfundTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontWeight: '700', fontSize: '15px', color: 'var(--accent-primary)' }}>
                  <span>TOTAL GROSS INVOICE AMOUNT:</span>
                  <span>GHS {grossTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Recurring Schedule Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="recCheck"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="recCheck" style={{ fontSize: '13px', cursor: 'pointer' }}>Set as Recurring Invoice Schedule</label>

                {isRecurring && (
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '12px' }}
                  >
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Generate Commercial Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Full-Page A4 Invoice Details Modal */}
      {selectedInvoice && (
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
          <div className="card printable-invoice" style={{ width: '720px', padding: '36px', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-primary)' }}>GHANA PUBLISHING COMPANY LTD</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assembly Press, Barnes Road, Accra | TIN: C0014892014</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>COMMERCIAL INVOICE</h3>
                <p style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: '700' }}>{selectedInvoice.invNo}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date: {selectedInvoice.date}</p>
              </div>
            </div>

            {/* Client Info */}
            <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>BILLED TO:</p>
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>{selectedInvoice.client}</h4>
            </div>

            {/* Items Table */}
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
                {selectedInvoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '500' }}>{item.description}</td>
                    <td style={{ textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>{(item.qty * item.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tax Schedule & Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', width: '300px', marginLeft: 'auto', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Net Subtotal:</span>
                <span>GHS {selectedInvoice.netAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>VAT (15%):</span>
                <span>GHS {selectedInvoice.vatAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>NHIL (2.5%):</span>
                <span>GHS {selectedInvoice.nhisAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>GETFund (2.5%):</span>
                <span>GHS {selectedInvoice.getfundAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border-color)', paddingTop: '8px', fontWeight: '700', fontSize: '15px', color: '#059669' }}>
                <span>GROSS AMOUNT DUE:</span>
                <span>GHS {selectedInvoice.grossAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>Close</button>
              <button className="btn btn-secondary" onClick={() => handleExportSinglePdf(selectedInvoice)}>
                <Download size={15} color="#dc2626" />
                Download Vector PDF
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={15} />
                Print Full-Page A4
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
