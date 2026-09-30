'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Shield, Mail, CheckCircle, XCircle, Edit3, Eye, EyeOff, Key, Lock, AlertCircle } from 'lucide-react';
import Pagination from '@/components/ui/pagination';

interface User {
  id: number;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin?: string;
  createdAt?: string;
}

const availableRoles = [
  { id: 'ADMIN', name: 'Finance Administrator' },
  { id: 'SENIOR_ACCOUNTANT', name: 'Senior Accountant' },
  { id: 'ACCOUNTS_RECEIVABLE_CLERK', name: 'AR Clerk' },
  { id: 'AUDITOR', name: 'Financial Auditor' },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states for Add User
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRoleId, setNewRoleId] = useState('SENIOR_ACCOUNTANT');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Form states for Edit User
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.status === 'SUCCESS' && Array.isArray(data.users)) {
        const mappedUsers: User[] = data.users.map((u: any) => {
          const roleObj = availableRoles.find(r => r.id === u.role);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            roleId: u.role,
            roleName: roleObj ? roleObj.name : u.role,
            status: u.status || (u.isActive ? 'ACTIVE' : 'INACTIVE'),
            lastLogin: u.lastLogin || 'Never',
            createdAt: u.createdAt,
          };
        });
        setUsers(mappedUsers);
      } else {
        setErrorMessage(data.message || 'Failed to load user accounts.');
      }
    } catch (err: any) {
      setErrorMessage('Network error fetching users.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRoleId: string) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRoleId }),
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        const roleObj = availableRoles.find(r => r.id === newRoleId);
        setUsers(users.map(u => u.id === userId ? { ...u, roleId: newRoleId, roleName: roleObj ? roleObj.name : newRoleId } : u));
        setSuccessMessage('User role updated successfully.');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to update role.');
      }
    } catch (err) {
      setErrorMessage('Error updating role.');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextActiveStatus = user.status !== 'ACTIVE';
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActiveStatus }),
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setUsers(users.map(u => u.id === user.id ? { ...u, status: nextActiveStatus ? 'ACTIVE' : 'INACTIVE' } : u));
        setSuccessMessage(`Account ${user.name} is now ${nextActiveStatus ? 'ACTIVE' : 'INACTIVE'}.`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to update status.');
      }
    } catch (err) {
      setErrorMessage('Error updating user status.');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      setFormError('Please complete all required fields.');
      return;
    }

    if (newPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRoleId,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (data.status === 'SUCCESS' && data.user) {
        const roleObj = availableRoles.find(r => r.id === data.user.role);
        const newUser: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          roleId: data.user.role,
          roleName: roleObj ? roleObj.name : data.user.role,
          status: data.user.status || 'ACTIVE',
          lastLogin: 'Never',
        };
        setUsers([...users, newUser]);
        setSuccessMessage(`User account created for ${data.user.email}`);
        setTimeout(() => setSuccessMessage(''), 4000);

        // Reset form
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setConfirmPassword('');
        setShowAddModal(false);
      } else {
        setFormError(data.message || 'Failed to create user account.');
      }
    } catch (err) {
      setFormError('Error creating user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRoleId(user.roleId);
    setEditStatus(user.status);
    setEditPassword('');
    setEditConfirmPassword('');
    setEditFormError('');
    setShowEditModal(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditFormError('');

    if (!editName.trim() || !editEmail.trim()) {
      setEditFormError('Full Name and Email Address are required.');
      return;
    }

    if (editPassword) {
      if (editPassword.length < 6) {
        setEditFormError('New password must be at least 6 characters long.');
        return;
      }
      if (editPassword !== editConfirmPassword) {
        setEditFormError('New passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRoleId,
        isActive: editStatus === 'ACTIVE',
      };
      if (editPassword) {
        payload.password = editPassword;
      }

      const res = await fetch(`/api/v1/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.status === 'SUCCESS' && data.user) {
        const roleObj = availableRoles.find(r => r.id === data.user.role);
        setUsers(users.map(u => u.id === editingUser.id ? {
          ...u,
          name: data.user.name,
          email: data.user.email,
          roleId: data.user.role,
          roleName: roleObj ? roleObj.name : data.user.role,
          status: data.user.status || (data.user.isActive ? 'ACTIVE' : 'INACTIVE'),
        } : u));

        setSuccessMessage(`Account updated for ${data.user.email}${editPassword ? ' (Password Reset)' : ''}`);
        setTimeout(() => setSuccessMessage(''), 4000);
        setShowEditModal(false);
      } else {
        setEditFormError(data.message || 'Failed to update user account.');
      }
    } catch (err) {
      setEditFormError('Error updating user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.ceil(users.length / pageSize);
  const paginatedUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>User Management & Account Administration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Manage system users, assign RBAC roles, configure login credentials, and reset account passwords.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          Add New User
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10b981', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

      {/* User Directory Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading user accounts...
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Assigned System Role</th>
                  <th>Account Status</th>
                  <th>Last Login</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>#{u.id}</td>
                    <td style={{ fontWeight: '600' }}>{u.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <select
                        value={u.roleId}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: '500',
                        }}
                      >
                        {availableRoles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{u.lastLogin || 'Never'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(u)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Edit Account Details or Reset Password"
                        >
                          <Edit3 size={13} />
                          Edit Account
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`btn ${u.status === 'ACTIVE' ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={users.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Add User Modal */}
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
          <div className="card" style={{ width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="var(--accent-primary)" />
              Add New User Account
            </h2>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444', marginBottom: '14px', fontSize: '13px' }}>
                {formError}
              </div>
            )}
            
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Samuel Adjei"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. sadjei@gpcl.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Assigned System Role *</label>
                <select
                  value={newRoleId}
                  onChange={e => setNewRoleId(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  {availableRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Initial Account Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters (e.g. Password123!)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '9px 36px 9px 9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Confirm Password *</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Re-enter password to confirm"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
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
          <div className="card" style={{ width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit3 size={20} color="var(--accent-primary)" />
              Edit Account - {editingUser.name}
            </h2>

            {editFormError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444', marginBottom: '14px', fontSize: '13px' }}>
                {editFormError}
              </div>
            )}
            
            <form onSubmit={handleEditUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email Address *</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Assigned System Role *</label>
                <select
                  value={editRoleId}
                  onChange={e => setEditRoleId(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  {availableRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Account Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={14} />
                  Reset / Change Password (Optional)
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Leave password fields empty to keep the user's existing password unchanged.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="New password (leave blank to keep current)"
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                      style={{ width: '100%', padding: '9px 36px 9px 9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {editPassword ? (
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={editConfirmPassword}
                      onChange={e => setEditConfirmPassword(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  ) : null}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
