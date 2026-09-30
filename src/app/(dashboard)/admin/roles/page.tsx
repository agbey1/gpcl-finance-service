'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Check, X, RefreshCw, Edit2, Trash2 } from 'lucide-react';

interface RolePermission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  userCount: number;
  permissions: string[];
  isSystem?: boolean;
}

const allPermissions: RolePermission[] = [
  { id: 'accounting.view', name: 'View General Ledger', description: 'View Chart of Accounts, Journal Entries, and Financial Reports', category: 'Accounting' },
  { id: 'accounting.journal.post', name: 'Post Journal Entries', description: 'Create and post manual or automated double-entry journals', category: 'Accounting' },
  { id: 'accounting.journal.reverse', name: 'Reverse Journals', description: 'Reverse posted GL journal entries with audit trail', category: 'Accounting' },
  { id: 'accounting.period.close', name: 'Close Financial Periods', description: 'Lock financial years and close accounting periods', category: 'Accounting' },
  { id: 'accounting.budget.view', name: 'View Budgets', description: 'View budget tracking and variance analysis', category: 'Accounting' },
  { id: 'accounting.budget.create', name: 'Create Budgets', description: 'Create and manage budgets', category: 'Accounting' },
  { id: 'finance.invoices.view', name: 'View Invoices', description: 'View customer invoices and AR balances', category: 'Invoicing & AR' },
  { id: 'finance.invoices.create', name: 'Create Invoices', description: 'Generate customer invoices with Ghana statutory levies', category: 'Invoicing & AR' },
  { id: 'finance.payments.view', name: 'View Payments', description: 'View payment records and history', category: 'Invoicing & AR' },
  { id: 'finance.payments.create', name: 'Record Payments', description: 'Record customer payment receipts and settle invoice balances', category: 'Invoicing & AR' },
  { id: 'finance.clients.view', name: 'View Clients', description: 'View client information and credit limits', category: 'Invoicing & AR' },
  { id: 'finance.clients.create', name: 'Create Clients', description: 'Create new client accounts', category: 'Invoicing & AR' },
  { id: 'finance.clients.update', name: 'Update Clients', description: 'Modify client information', category: 'Invoicing & AR' },
  { id: 'finance.clients.delete', name: 'Delete Clients', description: 'Deactivate client accounts', category: 'Invoicing & AR' },
  { id: 'reconciliation.manage', name: 'Manage Bank Reconciliation', description: 'Upload statement CSVs and match bank transactions', category: 'Banking' },
  { id: 'accounting.audit.view', name: 'View Audit Logs', description: 'View audit trail of all system changes', category: 'Administration' },
  { id: 'admin.roles.manage', name: 'Manage Roles & RBAC', description: 'Create roles and assign granular system permissions', category: 'Administration' },
];

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [activePermissions, setActivePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDescription, setEditRoleDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  async function fetchRoles() {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/roles', {
      });

      if (response.ok) {
        const data = await response.json();
        const loadedRoles: Role[] = (data.roles || []).map((role: any) => ({
          id: String(role.id),
          name: role.name,
          description: role.description || 'Enterprise role',
          userCount: role.userCount || 0,
          permissions: role.permissions || [],
          isSystem: role.isSystem ?? false,
        }));

        setRoles(loadedRoles);

        if (loadedRoles.length > 0) {
          const currentSelected = selectedRole
            ? loadedRoles.find(r => r.id === selectedRole.id) || loadedRoles[0]
            : loadedRoles[0];
          setSelectedRole(currentSelected);
          setActivePermissions(currentSelected.permissions);
        }
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Load on mount; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRoles();
  }, []);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setActivePermissions(role.permissions);
  };

  const togglePermission = (permId: string) => {
    if (activePermissions.includes(permId)) {
      setActivePermissions(activePermissions.filter(p => p !== permId));
    } else {
      setActivePermissions([...activePermissions, permId]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const response = await fetch('/api/v1/roles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleId: selectedRole.id,
          permissions: activePermissions,
        }),
      });

      if (response.ok) {
        setSaveNotice(`Permissions updated successfully for "${selectedRole.name}"!`);
        setTimeout(() => setSaveNotice(null), 4000);

        const updatedRoles = roles.map(r =>
          r.id === selectedRole.id ? { ...r, permissions: activePermissions } : r
        );
        setRoles(updatedRoles);
        setSelectedRole({ ...selectedRole, permissions: activePermissions });
      } else {
        const data = await response.json();
        alert(`Error: ${data.message || 'Failed to update permissions'}`);
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
    setSaving(false);
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      alert('Role name is required');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/v1/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDescription.trim(),
          permissions: activePermissions.length > 0 ? activePermissions : [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateModal(false);
        setNewRoleName('');
        setNewRoleDescription('');
        setSaveNotice(`New role "${data.role.name}" created successfully!`);
        setTimeout(() => setSaveNotice(null), 4000);
        fetchRoles();
      } else {
        const data = await response.json();
        alert(`Error: ${data.message || 'Failed to create role'}`);
      }
    } catch (error: any) {
      alert(`Failed to create role: ${error.message}`);
    }
    setCreating(false);
  };

  const openEditModal = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDescription(role.description || '');
    setShowEditModal(true);
  };

  const handleUpdateRole = async () => {
    if (!editingRole || !editRoleName.trim()) {
      alert('Role name is required');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/v1/roles/${editingRole.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editRoleName.trim(),
          description: editRoleDescription.trim(),
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setSaveNotice(`Role "${editRoleName}" updated successfully!`);
        setTimeout(() => setSaveNotice(null), 4000);
        fetchRoles();
      } else {
        const data = await response.json();
        alert(`Error: ${data.message || 'Failed to update role'}`);
      }
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    }
    setUpdating(false);
  };

  const openDeleteModal = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingRole(role);
    setShowDeleteModal(true);
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/roles/${deletingRole.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setSaveNotice(`Role "${deletingRole.name}" deleted successfully!`);
        setTimeout(() => setSaveNotice(null), 4000);
        setDeletingRole(null);
        fetchRoles();
      } else {
        const data = await response.json();
        alert(`Error: ${data.message || 'Failed to delete role'}`);
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
    setDeleting(false);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading roles & permissions...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Roles & Access Permissions (RBAC)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            Manage system roles, custom user roles, security policies, and granular feature permissions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchRoles} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Create New Role
          </button>
        </div>
      </div>

      {saveNotice && (
        <div style={{ padding: '12px 16px', background: 'rgba(5, 150, 105, 0.1)', border: '1px solid #059669', borderRadius: '8px', color: '#059669', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Create New Role</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>Role Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Financial Analyst, Procurement Supervisor"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>Description</label>
                <textarea
                  placeholder="Describe the responsibilities and scope of this role"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', minHeight: '80px', fontFamily: 'inherit', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={creating}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateRole} disabled={creating}>{creating ? 'Creating...' : 'Create Role'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && editingRole && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Edit Role</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>Role Name *</label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>Description</label>
                <textarea
                  value={editRoleDescription}
                  onChange={(e) => setEditRoleDescription(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', minHeight: '80px', fontFamily: 'inherit', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={updating}>Cancel</button>
                <button className="btn btn-primary" onClick={handleUpdateRole} disabled={updating}>{updating ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingRole && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '420px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', marginBottom: '12px' }}>Delete Custom Role</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Are you sure you want to delete the custom role <strong>&ldquo;{deletingRole.name}&rdquo;</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteRole} disabled={deleting} style={{ background: '#dc2626', color: 'white' }}>
                {deleting ? 'Deleting...' : 'Delete Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout: Roles List vs Permission Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Roles List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>SYSTEM & ENTERPRISE ROLES</h3>
          {roles.map(role => {
            const isSelected = selectedRole?.id === role.id;
            return (
              <div
                key={role.id}
                onClick={() => handleRoleSelect(role)}
                className="card"
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                  background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '600', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)', margin: 0 }}>{role.name}</h4>
                    {!role.isSystem ? (
                      <span className="badge badge-info" style={{ fontSize: '10px', padding: '2px 6px' }}>Custom</span>
                    ) : (
                      <span className="badge" style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>System</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-info">{role.userCount} User{role.userCount !== 1 ? 's' : ''}</span>
                    {!role.isSystem && (
                      <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                        <button
                          onClick={(e) => openEditModal(role, e)}
                          title="Edit Role Name & Description"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', borderRadius: '4px' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => openDeleteModal(role, e)}
                          title="Delete Custom Role"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444', borderRadius: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{role.description}</p>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '500' }}>
                  {role.permissions.length} Active Permission{role.permissions.length !== 1 ? 's' : ''}
                </p>
              </div>
            );
          })}
          {roles.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No roles available
            </div>
          )}
        </div>

        {/* Permission Matrix */}
        {selectedRole && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Permissions for {selectedRole.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Toggle permissions and click Save Permissions to update database access level.</p>
              </div>
              <button className="btn btn-primary" onClick={handleSavePermissions} disabled={saving}>
                <Check size={16} />
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {['Accounting', 'Invoicing & AR', 'Banking', 'Administration'].map(category => (
                <div key={category}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-primary)', marginBottom: '10px' }}>
                    {category} Modules
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allPermissions.filter(p => p.category === category).map(perm => {
                      const isGranted = activePermissions.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: isGranted ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: isGranted ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{perm.name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{perm.description} ({perm.id})</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isGranted}
                            onChange={() => {}}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
