'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2, Building2, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        if (data.token) {
          localStorage.setItem('gpcl_token', data.token);
        }
        window.location.href = '/dashboard';
      } else {
        setErrorMsg(data.message || 'Invalid email address or password.');
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg('Network or server error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      background: 'var(--bg-primary)',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      {/* Left Hero Branding Section */}
      <div style={{
        flex: '1.2',
        background: 'linear-gradient(135deg, #001e3d 0%, #003870 50%, #00478f 100%)',
        color: '#ffffff',
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient Decorative Background Glows */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(250, 175, 0, 0.15) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(0, 71, 143, 0.4) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
        }} />

        {/* Top Brand Header */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
              border: '2px solid #faaf00',
              overflow: 'hidden',
              padding: '2px',
            }}>
              <img src="/logo.jpg" alt="GPCL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
                Ghana Publishing Co. Ltd.
              </h2>
              <p style={{ fontSize: '12px', color: '#faaf00', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
                Assembly Press, Accra
              </p>
            </div>
          </div>
        </div>

        {/* Middle Value Proposition Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '520px', margin: '40px 0' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1.25', marginBottom: '18px', color: '#ffffff' }}>
            Commercial Finance & Accounts Receivable Management
          </h1>
          <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '32px' }}>
            Automated statutory tax compliance (15% VAT, 2.5% NHIL, 2.5% GETFund), real-time General Ledger posting, AR exposure monitoring, and General Ledger financial statements.
          </p>

          {/* Feature Highlights Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.08)', padding: '12px 18px', borderRadius: '10px', backdropFilter: 'blur(8px)' }}>
              <CheckCircle2 size={20} color="#faaf00" />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Ghana GRA Tax Compliance & Levy Computation</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.08)', padding: '12px 18px', borderRadius: '10px', backdropFilter: 'blur(8px)' }}>
              <Building2 size={20} color="#faaf00" />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Accounts Receivable Aging & Credit Exposure Engine</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.08)', padding: '12px 18px', borderRadius: '10px', backdropFilter: 'blur(8px)' }}>
              <FileSpreadsheet size={20} color="#faaf00" />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Automated Reversing GL Entries & Period Lock Engine</span>
            </div>
          </div>
        </div>

        {/* Bottom System Info */}
        <div style={{ position: 'relative', zIndex: 2, fontSize: '12.5px', color: '#94a3b8' }}>
          © {new Date().getFullYear()} Ghana Publishing Company Limited. All Rights Reserved.
        </div>
      </div>

      {/* Right Login Form Container */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        background: 'var(--bg-card)',
      }}>
        <div className="fade-in" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Sign In
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Enter your credentials to access the finance portal
            </p>
          </div>

          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid var(--accent-danger)',
              borderRadius: '10px',
              color: 'var(--accent-danger)',
              fontSize: '13.5px',
              marginBottom: '24px',
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Email Address
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--bg-primary)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 16px',
                transition: 'all 0.2s',
              }}>
                <Mail size={18} color="var(--text-muted)" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@gpcl.com"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--bg-primary)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 16px',
                transition: 'all 0.2s',
              }}>
                <Lock size={18} color="var(--text-muted)" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                marginTop: '8px',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '700',
                boxShadow: '0 4px 14px rgba(0, 71, 143, 0.3)',
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
