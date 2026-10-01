'use client';

import { useState, useEffect } from 'react';
import { Settings, Building, Percent, Shield, Save, Check, RefreshCw, BookOpen } from 'lucide-react';
import GlAccountMapping from '@/components/settings/gl-account-mapping';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'TAX' | 'ACCOUNTING' | 'GL_ACCOUNTS' | 'SECURITY'>('COMPANY');
  const [savedNotice, setSavedNotice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('Ghana Publishing Company Limited (GPCL)');
  const [tin, setTin] = useState('C0014892014');
  const [currency, setCurrency] = useState('GHS (Ghanaian Cedi)');
  const [fyStart, setFyStart] = useState('January 1');

  // Tax rates
  const [vatRate, setVatRate] = useState(15.0);
  const [nhilRate, setNhilRate] = useState(2.5);
  const [getfundRate, setGetfundRate] = useState(2.5);
  const [whtRate, setWhtRate] = useState(7.5);

  // Accounting Policy
  const [tolerance, setTolerance] = useState(0.001);
  const [autoPostGrn, setAutoPostGrn] = useState(true);
  const [allowOverdue, setAllowOverdue] = useState(false);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/settings', {
      });

      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        if (s) {
          setCompanyName(s.companyName || companyName);
          setTin(s.tin || tin);
          setCurrency(s.currency || currency);
          setFyStart(s.fyStart || fyStart);
          setVatRate(s.vatRate ?? vatRate);
          setNhilRate(s.nhilRate ?? nhilRate);
          setGetfundRate(s.getfundRate ?? getfundRate);
          setWhtRate(s.whtRate ?? whtRate);
          setTolerance(s.tolerance ?? tolerance);
          setAutoPostGrn(s.autoPostGrn ?? autoPostGrn);
          setAllowOverdue(s.allowOverdue ?? allowOverdue);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Load on mount; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        companyName,
        tin,
        currency,
        fyStart,
        vatRate,
        nhilRate,
        getfundRate,
        whtRate,
        tolerance,
        autoPostGrn,
        allowOverdue,
      };

      const res = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 4000);
      } else {
        const data = await res.json();
        alert(`Error: ${data.message || 'Failed to save settings'}`);
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading system configurations...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>System Settings & Financial Configuration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Configure enterprise organization profile, statutory tax levy rates, GL policies, and security limits.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchSettings} disabled={saving}>
            <RefreshCw size={16} />
            Reload
          </button>
          {activeTab !== 'GL_ACCOUNTS' && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Configurations'}
            </button>
          )}
        </div>
      </div>

      {savedNotice && (
        <div style={{ padding: '12px 16px', background: 'rgba(5, 150, 105, 0.1)', border: '1px solid #059669', borderRadius: '8px', color: '#059669', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} />
          <span>System configurations saved successfully to SQL Server database!</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {[
          { id: 'COMPANY', label: 'Company Profile', icon: Building },
          { id: 'TAX', label: 'Statutory Levies & Tax Rates', icon: Percent },
          { id: 'ACCOUNTING', label: 'General Ledger Policies', icon: Settings },
          { id: 'GL_ACCOUNTS', label: 'GL Account Mapping', icon: BookOpen },
          { id: 'SECURITY', label: 'Security & Session', icon: Shield },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="btn btn-secondary"
              style={{
                borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-color)',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-primary)' : 'var(--bg-card)',
                fontWeight: isActive ? '600' : '400',
                gap: '8px',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Settings Form Container */}
      <div className="card">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeTab === 'COMPANY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Organization Profile</h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  padding: '4px',
                }}>
                  <img src="/logo.jpg" alt="Official GPCL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Official Corporate Logo</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Active system brand asset loaded from <code style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>/logo.jpg</code>
                  </p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Registered Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>GRA Tax Identification Number (TIN)</label>
                  <input
                    type="text"
                    value={tin}
                    onChange={e => setTin(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Base Accounting Currency</label>
                  <input
                    type="text"
                    value={currency}
                    disabled
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Financial Year Start Date</label>
                <input
                  type="text"
                  value={fyStart}
                  onChange={e => setFyStart(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'TAX' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Ghana Statutory Tax & Levy Rates</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Reference values only. Invoices currently apply fixed rates of VAT 15%, NHIL 2.5% and GETFund 2.5%; changing these fields does not change invoice calculations.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Value Added Tax (VAT %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vatRate}
                    onChange={e => setVatRate(parseFloat(e.target.value))}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>National Health Insurance Levy (NHIL %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={nhilRate}
                    onChange={e => setNhilRate(parseFloat(e.target.value))}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>GETFund Levy (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={getfundRate}
                    onChange={e => setGetfundRate(parseFloat(e.target.value))}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Default Withholding Tax (WHT %)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={whtRate}
                    onChange={e => setWhtRate(parseFloat(e.target.value))}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ACCOUNTING' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>General Ledger Rules & Tolerance</h3>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>GL Double-Entry Imbalance Tolerance (GHS)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={tolerance}
                  onChange={e => setTolerance(parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="autoGrn"
                  checked={autoPostGrn}
                  onChange={e => setAutoPostGrn(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="autoGrn" style={{ fontSize: '14px', cursor: 'pointer' }}>Auto-post Store Goods Received Note (GRN) inventory journals</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="allowOverdue"
                  checked={allowOverdue}
                  onChange={e => setAllowOverdue(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="allowOverdue" style={{ fontSize: '14px', cursor: 'pointer' }}>Allow issuing new invoices to customers with overdue balances &gt; 90 days</label>
              </div>
            </div>
          )}

          {activeTab === 'GL_ACCOUNTS' && <GlAccountMapping />}

          {activeTab === 'SECURITY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Security & API Rate Limits</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>JWT Session Timeout (Hours)</label>
                  <input
                    type="number"
                    value={8}
                    readOnly
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>API Rate Limiting Bucket (Req / min)</label>
                  <input
                    type="number"
                    value={100}
                    readOnly
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
