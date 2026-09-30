'use client';

import { useState } from 'react';
import { ShieldCheck, Search, Filter, Clock, User, Activity } from 'lucide-react';
import Pagination from '@/components/ui/pagination';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
}

const mockLogs: AuditLog[] = [
  { id: 'LOG-88410', timestamp: '2026-09-02 00:28', user: 'admin@gpcl.com', action: 'POST_JOURNAL', module: 'GL', details: 'Posted Manual Journal #JNL-2026-089419 for GHS 15,400.00', ipAddress: '192.168.1.45' },
  { id: 'LOG-88409', timestamp: '2026-09-02 00:15', user: 'admin@gpcl.com', action: 'UPDATE_OPENING_BALANCE', module: 'COA', details: 'Updated Account #1001 Opening Balance to GHS 10,000.00', ipAddress: '192.168.1.45' },
  { id: 'LOG-88408', timestamp: '2026-09-01 23:40', user: 'admin@gpcl.com', action: 'CREATE_USER', module: 'RBAC', details: 'Created user account Samuel Adjei (sadjei@gpcl.com)', ipAddress: '192.168.1.45' },
  { id: 'LOG-88407', timestamp: '2026-09-01 22:50', user: 'kmensah@gpcl.com', action: 'CREATE_INVOICE', module: 'AR', details: 'Generated Invoice #INV-2026-001054 for GHS 27,000.00', ipAddress: '192.168.1.88' },
  { id: 'LOG-88406', timestamp: '2026-09-01 21:10', user: 'aosei@gpcl.com', action: 'RECORD_PAYMENT', module: 'PAYMENTS', details: 'Recorded Payment #PAY-2026-000412 for GHS 10,000.00', ipAddress: '192.168.1.92' },
];

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filtered = mockLogs.filter(l =>
    l.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>System Audit Trail & Security Event Logs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Immutable audit log register tracking user actions, voucher modifications, and security events.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Search size={16} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Filter audit logs by User Email, Action, or Details..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '14px' }}
        />
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Timestamp</th>
              <th>User Account</th>
              <th>Event Action</th>
              <th>Module</th>
              <th>Action Details</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(log => (
              <tr key={log.id}>
                <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{log.id}</td>
                <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                <td style={{ fontWeight: '600' }}>{log.user}</td>
                <td><span className="badge badge-info">{log.action}</span></td>
                <td>{log.module}</td>
                <td style={{ fontSize: '13px' }}>{log.details}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{log.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={p => setCurrentPage(p)}
        />
      </div>
    </div>
  );
}
