'use client';

import { useState, useEffect } from 'react';
import { useSidebar } from './sidebar-context';
import { Bell, Search, Sun, Moon, AlertTriangle, FileText, Landmark, X, PanelLeft } from 'lucide-react';

interface NotificationItem {
  id: number;
  title: string;
  desc: string;
  time: string;
  type: 'WARNING' | 'INFO' | 'DANGER';
}

export default function Topbar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Alerts derived from live data. Each check is skipped silently if the
  // user lacks the permission to read that data.
  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const getJson = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);

    Promise.all([
      getJson('/api/v1/invoices/query?status=UNPAID&take=200'),
      getJson('/api/v1/invoices/query?status=PARTIAL&take=200'),
      getJson(`/api/v1/accounting/periods?year=${lastMonth.getUTCFullYear()}`),
    ]).then(([unpaid, partial, periods]) => {
      if (cancelled) return;
      const items: NotificationItem[] = [];
      const open = [...(unpaid?.invoices ?? []), ...(partial?.invoices ?? [])] as { DueDate: string; BalanceDue: number }[];
      const overdue = open.filter((i) => String(i.DueDate).slice(0, 10) < today && Number(i.BalanceDue) > 0);
      if (overdue.length) {
        const total = overdue.reduce((s, i) => s + Number(i.BalanceDue), 0);
        items.push({
          id: 1,
          title: 'Overdue customer invoices',
          desc: `${overdue.length} invoice(s) past due, GHS ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding.`,
          time: 'now',
          type: 'DANGER',
        });
      }
      const period = periods?.periods?.find((p: { periodNumber: number }) => p.periodNumber === lastMonth.getUTCMonth() + 1);
      if (period && !period.isClosed) {
        items.push({
          id: 2,
          title: 'Previous period still open',
          desc: `${lastMonth.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })} has not been closed. Close it once reconciliations and levy returns are done.`,
          time: 'now',
          type: 'WARNING',
        });
      }
      setNotifications(items);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Hydrate client-only preferences after mount (localStorage is unavailable during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const savedTheme = localStorage.getItem('gpcl_theme') as 'light' | 'dark' | null;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('gpcl_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const removeNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <header style={{
      height: '64px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      position: 'fixed',
      top: 0,
      right: 0,
      left: isCollapsed ? '72px' : '260px',
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      boxShadow: 'var(--shadow-sm)',
      transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Left Search & Sidebar Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="btn btn-secondary"
          style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
        >
          <PanelLeft size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 14px', width: '340px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search accounts, journals, invoices..."
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13px', width: '100%' }}
          />
        </div>
      </div>

      {/* Action Indicators, Notification Center & Theme Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary"
          style={{ padding: '8px 12px', gap: '6px', fontSize: '12px' }}
        >
          {mounted && theme === 'dark' ? (
            <>
              <Sun size={15} color="#fbbf24" />
              Light Mode
            </>
          ) : (
            <>
              <Moon size={15} color="var(--text-secondary)" />
              Dark Mode
            </>
          )}
        </button>

        {/* Bell Icon Notification Button */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative', padding: '4px' }}
        >
          <Bell size={20} />
          {notifications.length > 0 && (
            <span style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '16px',
              height: '16px',
              background: 'var(--accent-primary)',
              borderRadius: '50%',
              color: 'white',
              fontSize: '10px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {notifications.length}
            </span>
          )}
        </button>

        {/* Notification Center Popover */}
        {showNotifications && (
          <div className="card" style={{
            position: 'absolute',
            top: '50px',
            right: 0,
            width: '360px',
            padding: '16px',
            zIndex: 100,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700' }}>Financial System Alerts</h4>
              <span className="badge badge-info">{notifications.length} Active</span>
            </div>

            {notifications.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No active notifications</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      position: 'relative',
                    }}
                  >
                    {n.type === 'WARNING' && <AlertTriangle size={16} color="#d97706" style={{ marginTop: '2px' }} />}
                    {n.type === 'INFO' && <Landmark size={16} color="#0284c7" style={{ marginTop: '2px' }} />}
                    {n.type === 'DANGER' && <FileText size={16} color="#dc2626" style={{ marginTop: '2px' }} />}

                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600' }}>{n.title}</p>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.3' }}>{n.desc}</p>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>{n.time}</span>
                    </div>

                    <button
                      onClick={() => removeNotification(n.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
