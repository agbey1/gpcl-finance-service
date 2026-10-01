'use client';

import { useEffect, useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2, Building2, FileSpreadsheet } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Arriving at the login page (including via "Sign Out") ends any existing session.
  useEffect(() => {
    localStorage.removeItem('gpcl_token');
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

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
        window.location.href = '/dashboard';
      } else {
        setErrorMsg(data.message || 'Invalid email address or password.');
        setLoading(false);
      }
    } catch {
      setErrorMsg('Network or server error occurred. Please try again.');
      setLoading(false);
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className="login-root">
      {/* Brand panel: full side panel on desktop, banner on tablet, slim header on phones */}
      <div className="login-hero">
        <div className="login-glow login-glow-a" />
        <div className="login-glow login-glow-b" />

        <div className="login-brand">
          <div className="login-logo">
            <img src="/logo.jpg" alt="GPCL Logo" />
          </div>
          <div>
            <h2 className="login-brand-name">Ghana Publishing Co. Ltd.</h2>
            <p className="login-brand-place">Assembly Press, Accra</p>
          </div>
        </div>

        <div className="login-hero-copy">
          <h1>Commercial Finance &amp; Accounts Receivable Management</h1>
          <p>
            Automated statutory tax compliance (15% VAT, 2.5% NHIL, 2.5% GETFund), real-time General Ledger posting, AR exposure monitoring, and General Ledger financial statements.
          </p>
          <div className="login-features">
            <div className="login-feature">
              <CheckCircle2 size={20} color="#faaf00" />
              <span>Ghana GRA Tax Compliance &amp; Levy Computation</span>
            </div>
            <div className="login-feature">
              <Building2 size={20} color="#faaf00" />
              <span>Accounts Receivable Aging &amp; Credit Exposure Engine</span>
            </div>
            <div className="login-feature">
              <FileSpreadsheet size={20} color="#faaf00" />
              <span>Automated Reversing GL Entries &amp; Period Lock Engine</span>
            </div>
          </div>
        </div>

        <div className="login-copyright login-copyright-hero">
          © {year} Ghana Publishing Company Limited. All Rights Reserved.
        </div>
      </div>

      {/* Sign-in form */}
      <div className="login-panel">
        <div className="fade-in login-form-wrap">
          <div className="login-heading">
            <h2>Sign In</h2>
            <p>Enter your credentials to access the finance portal</p>
          </div>

          {errorMsg && (
            <div className="login-error" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div>
              <label htmlFor="login-email" className="login-label">Email Address</label>
              <div className="login-field">
                <Mail size={18} color="var(--text-muted)" />
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@gpcllive.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="login-label">Password</label>
              <div className="login-field">
                <Lock size={18} color="var(--text-muted)" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  className="login-reveal"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
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

          <div className="login-copyright login-copyright-panel">
            © {year} Ghana Publishing Company Limited. All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
