'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar } from './sidebar-context';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  FileCheck,
  CreditCard,
  Building2,
  PieChart,
  Settings,
  LogOut,
  Landmark,
  Receipt,
  ShieldCheck,
  Users,
  Target,
  Activity,
  Lock,
  ChevronLeft,
  ChevronRight, Contact } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Voucher Entry (F4-F7)', href: '/accounting/vouchers', icon: FileCheck },
  { label: 'Chart of Accounts', href: '/accounting/accounts', icon: BookOpen },
  { label: 'Journal Entries Register', href: '/accounting/journal-entries', icon: FileText },
  { label: 'Customers', href: '/finance/clients', icon: Contact },
  { label: 'Invoices & AR', href: '/finance/invoices', icon: CreditCard },
  { label: 'Customer Payments', href: '/finance/payments', icon: Receipt },
  { label: 'Bank Reconciliation', href: '/accounting/bank-reconciliations', icon: Landmark },
  { label: 'Budgets vs. Actuals', href: '/accounting/budgets', icon: Target },
  { label: 'Fiscal Period Close', href: '/accounting/period-close', icon: Lock },
  { label: 'Ghana GRA Tax Returns', href: '/accounting/tax-reports', icon: Building2 },
  { label: 'Financial Reports', href: '/accounting/reports', icon: PieChart },
  { label: 'User Management', href: '/admin/users', icon: Users },
  { label: 'Roles & Permissions', href: '/admin/roles', icon: ShieldCheck },
  { label: 'System Audit Logs', href: '/admin/audit-logs', icon: Activity },
  { label: 'System Settings', href: '/admin/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const width = isCollapsed ? '72px' : '260px';
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.user) setUser({ name: d.user.name, email: d.user.email }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const initials = (user?.name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

  return (
    <aside style={{
      width,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 50,
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
    }}>
      {/* Brand Header */}
      <div style={{
        padding: isCollapsed ? '16px 12px' : '16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        height: '64px',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            padding: '2px',
            flexShrink: 0,
          }}>
            <img src="/logo.jpg" alt="GPCL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }} />
          </div>
          {!isCollapsed && (
            <div style={{ whiteSpace: 'nowrap' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.01em', color: '#ffffff', margin: 0 }}>GPCL</h2>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '400', margin: 0 }}>Finance & Accounting</p>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
            marginLeft: isCollapsed ? '0' : '8px',
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav style={{
        flex: 1,
        padding: isCollapsed ? '16px 8px' : '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: isCollapsed ? '10px 0' : '10px 14px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                borderLeft: !isCollapsed && isActive ? '3px solid var(--accent-gold)' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={18} color={isActive ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.6)'} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile */}
      <div style={{
        padding: isCollapsed ? '16px 8px' : '16px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
      }}>
        {!isCollapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'white', margin: 0 }}>{user?.name ?? ''}</p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{user?.email ?? ''}</p>
              </div>
            </div>
            <Link href="/login" title="Sign Out" style={{ color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <LogOut size={16} />
            </Link>
          </>
        ) : (
          <Link href="/login" title={user ? `Sign Out (${user.email})` : 'Sign Out'} style={{ color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }}>
            <LogOut size={18} />
          </Link>
        )}
      </div>
    </aside>
  );
}
