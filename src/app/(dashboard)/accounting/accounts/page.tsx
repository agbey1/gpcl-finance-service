'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Check, Edit3, ArrowRightLeft } from 'lucide-react';
import Pagination from '@/components/ui/pagination';

interface Account {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  control: boolean;
  openingBalance: string;
  balance: string;
}

const initialAccounts: Account[] = [
  { code: '1001', name: 'Main Cash Account', type: 'ASSET', control: false, openingBalance: '10,000.00', balance: '14,250.00' },
  { code: '1002', name: 'GCB Bank - Operating Account', type: 'ASSET', control: false, openingBalance: '150,000.00', balance: '185,400.00' },
  { code: '1003', name: 'Ecobank - Operational Account', type: 'ASSET', control: false, openingBalance: '50,000.00', balance: '92,100.00' },
  { code: '1100', name: 'Trade Receivables (AR)', type: 'ASSET', control: true, openingBalance: '210,000.00', balance: '248,500.00' },
  { code: '1201', name: 'Finished Goods Inventory', type: 'ASSET', control: true, openingBalance: '90,000.00', balance: '94,200.00' },
  { code: '1202', name: 'Materials Store Inventory', type: 'ASSET', control: true, openingBalance: '140,000.00', balance: '162,100.00' },
  { code: '2001', name: 'Accounts Payable (AP)', type: 'LIABILITY', control: true, openingBalance: '60,000.00', balance: '78,300.00' },
  { code: '2100', name: 'VAT Payable (15%)', type: 'LIABILITY', control: false, openingBalance: '25,000.00', balance: '33,750.00' },
  { code: '2102', name: 'NHIS Payable (2.5%)', type: 'LIABILITY', control: false, openingBalance: '5,000.00', balance: '5,625.00' },
  { code: '2103', name: 'GETFund Payable (2.5%)', type: 'LIABILITY', control: false, openingBalance: '5,000.00', balance: '5,625.00' },
  { code: '3001', name: 'Stated Capital', type: 'EQUITY', control: false, openingBalance: '300,000.00', balance: '300,000.00' },
  { code: '4001', name: 'Commercial Printing Revenue', type: 'REVENUE', control: false, openingBalance: '0.00', balance: '640,000.00' },
  { code: '5001', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', control: false, openingBalance: '0.00', balance: '310,000.00' },
  { code: '6100', name: 'Salaries & Wages Expense', type: 'EXPENSE', control: false, openingBalance: '0.00', balance: '48,750.00' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<Account | null>(null);
  const [newOpeningBal, setNewOpeningBal] = useState('');

  // New Account Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'>('ASSET');
  const [control, setControl] = useState(false);
  const [initialOpening, setInitialOpening] = useState('0.00');

  useEffect(() => {
    fetch('/api/v1/accounting/accounts')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'SUCCESS' && Array.isArray(data.accounts) && data.accounts.length > 0) {
          const apiAccs: Account[] = data.accounts.map((a: any) => ({
            code: a.AccountCode,
            name: a.AccountName,
            type: a.AccountType || 'ASSET',
            control: false,
            openingBalance: '0.00',
            balance: '0.00',
          }));
          setAccounts(apiAccs);
        }
      })
      .catch(() => {});
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;

    try {
      const res = await fetch('/api/v1/accounting/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountCode: code, accountName: name, accountType: type }),
      });
      const data = await res.json();
      if (!res.ok || data.status === 'ERROR') {
        alert(data.message || 'Failed to create account');
        return;
      }

      const newAccount: Account = {
        code,
        name,
        type,
        control,
        openingBalance: Number(initialOpening).toFixed(2),
        balance: Number(initialOpening).toFixed(2),
      };

      setAccounts([...accounts, newAccount]);
      setCode('');
      setName('');
      setControl(false);
      setInitialOpening('0.00');
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const handleUpdateOpeningBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcc) return;

    setAccounts(accounts.map(acc => acc.code === selectedAcc.code ? {
      ...acc,
      openingBalance: Number(newOpeningBal).toFixed(2),
    } : acc));

    setSelectedAcc(null);
    setShowOpeningModal(false);
  };

  const filtered = accounts.filter(a => {
    const matchesType = filterType === 'ALL' || a.type === filterType;
    const matchesSearch = a.code.includes(searchTerm) || a.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Chart of Accounts & Opening Balances</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            General Ledger account hierarchy, opening balance initialization, and control accounts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add New Account
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(t => (
            <button
              key={t}
              onClick={() => { setFilterType(t); setCurrentPage(1); }}
              className="btn btn-secondary"
              style={{
                borderColor: filterType === t ? 'var(--accent-primary)' : 'var(--border-color)',
                color: filterType === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: filterType === t ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 14px', width: '280px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search code or account..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Code</th>
              <th>Account Name</th>
              <th>Category</th>
              <th>Control Account</th>
              <th style={{ textAlign: 'right' }}>Opening Balance (GHS)</th>
              <th style={{ textAlign: 'right' }}>Current GL Balance (GHS)</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(acc => (
              <tr key={acc.code}>
                <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{acc.code}</td>
                <td style={{ fontWeight: '600' }}>{acc.name}</td>
                <td>
                  <span className={`badge ${
                    acc.type === 'ASSET' ? 'badge-info' :
                    acc.type === 'LIABILITY' ? 'badge-warning' :
                    acc.type === 'REVENUE' ? 'badge-success' : 'badge-danger'
                  }`}>
                    {acc.type}
                  </span>
                </td>
                <td>{acc.control ? 'YES (Control Account)' : 'NO'}</td>
                <td style={{ textAlign: 'right', fontWeight: '600', fontFamily: 'monospace' }}>GHS {acc.openingBalance}</td>
                <td style={{ textAlign: 'right', fontWeight: '700' }}>GHS {acc.balance}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => { setSelectedAcc(acc); setNewOpeningBal(acc.openingBalance); setShowOpeningModal(true); }}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    <Edit3 size={12} />
                    Edit Opening
                  </button>
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

      {/* Add New Account Modal */}
      {showAddModal && (
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
          <div className="card" style={{ width: '450px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Add New Chart of Account</h2>
            
            <form onSubmit={handleAddAccount} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Account Code</label>
                <input
                  type="text"
                  placeholder="e.g. 1004 / 6500"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Office Supplies Expense"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Account Category / Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="ASSET">ASSET (1000s)</option>
                  <option value="LIABILITY">LIABILITY (2000s)</option>
                  <option value="EQUITY">EQUITY (3000s)</option>
                  <option value="REVENUE">REVENUE (4000s)</option>
                  <option value="EXPENSE">EXPENSE (5000s/6000s)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Opening Balance (GHS)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={initialOpening}
                  onChange={e => setInitialOpening(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="isControl"
                  checked={control}
                  onChange={e => setControl(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <label htmlFor="isControl" style={{ fontSize: '13px', cursor: 'pointer' }}>Is Control Account (Restricts Direct Posting)</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Opening Balance Modal */}
      {showOpeningModal && selectedAcc && (
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
          <div className="card" style={{ width: '420px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Set Opening Balance</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Account #{selectedAcc.code} - {selectedAcc.name}
            </p>

            <form onSubmit={handleUpdateOpeningBalance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Opening Balance (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newOpeningBal}
                  onChange={e => setNewOpeningBal(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOpeningModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Opening Balance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
