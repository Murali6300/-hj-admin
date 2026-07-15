import { useEffect, useState } from 'react';
import api from '../api';
import { isFullAccess } from '../utils/adminPermissions';

interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#F44336',
  ADMIN: '#1A73E8',
  SUPPORT: '#4CAF50',
  FINANCE: '#FF6D00',
  OPERATIONS: '#9C27B0',
};

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE', 'OPERATIONS'];

export default function RolesPermissionsPage() {
  const fullAccess = isFullAccess();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'SUPPORT' });

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: 0, size: 100 };
      if (filterRole) params.role = filterRole;
      const res = await api.get('/admin-users', { params });
      setAdmins(res.data.content || res.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchAdmins(); }, [filterRole]);

  const openCreate = () => {
    setEditAdmin(null);
    setForm({ email: '', password: '', fullName: '', role: 'SUPPORT' });
    setShowCreate(true);
  };

  const openEdit = (a: AdminUser) => {
    setEditAdmin(a);
    setForm({ email: a.email, password: '', fullName: a.fullName, role: a.role });
    setShowCreate(true);
  };

  const handleSubmit = async () => {
    if (!confirm(editAdmin ? `Update admin "${form.fullName}"?` : `Create new admin "${form.fullName}"?`)) return;
    try {
      if (editAdmin) {
        const payload: any = { email: form.email, fullName: form.fullName, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/admin-users/${editAdmin.id}`, payload);
      } else {
        await api.post('/admin-users', form);
      }
      setShowCreate(false);
      fetchAdmins();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save admin user');
    }
  };

  const handleToggleActive = async (id: number) => {
    if (!confirm('Deactivate this admin user? They will not be able to log in until reactivated.')) return;
    try { await api.put(`/admin-users/${id}/toggle-active`); fetchAdmins(); } catch { alert('Failed to toggle'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this admin user?')) return;
    try { await api.delete(`/admin-users/${id}`); fetchAdmins(); } catch { alert('Failed to delete'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>Roles & Permissions</h1>
        {fullAccess && (
          <button onClick={openCreate}
            style={{ padding: '8px 16px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            + Add Admin User
          </button>
        )}
      </div>

      {!fullAccess && (
        <div style={{ background: '#FFF3E0', color: '#E65100', padding: 12, borderRadius: 6, marginBottom: 20, fontSize: 13 }}>
          You have view-only access. Contact a Super Admin or Admin to manage admin users.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {ROLES.map((r) => (
          <div key={r} style={{ background: '#fff', borderRadius: 8, padding: 14, borderLeft: `4px solid ${ROLE_COLORS[r]}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <p style={{ fontSize: 12, color: '#757575' }}>{r.replace(/_/g, ' ')}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: ROLE_COLORS[r] }}>{admins.filter((a) => a.role === r).length}</p>
          </div>
        ))}
      </div>

      {loading ? <p>Loading...</p> : admins.length === 0 ? (
        <p style={{ color: '#757575' }}>No admin users found</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Last Login</th>
              <th style={thStyle}>Created</th>
              {fullAccess && <th style={thStyle}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={tdStyle}>{a.id}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{a.fullName}</td>
                <td style={tdStyle}>{a.email}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: ROLE_COLORS[a.role] || '#9E9E9E' }}>
                    {a.role.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: a.isActive ? '#4CAF50' : '#9E9E9E' }}>
                    {a.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: '#757575' }}>{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString('en-IN') : 'Never'}</td>
                <td style={{ ...tdStyle, color: '#757575' }}>{new Date(a.createdAt).toLocaleDateString('en-IN')}</td>
                {fullAccess && (
                  <td style={tdStyle}>
                    <button onClick={() => openEdit(a)} style={{ marginRight: 6, padding: '4px 10px', background: '#FFC107', color: '#333', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                    <button onClick={() => handleToggleActive(a.id)}
                      style={{ marginRight: 6, padding: '4px 10px', background: a.isActive ? '#FF6D00' : '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      {a.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDelete(a.id)}
                      style={{ padding: '4px 10px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>{editAdmin ? 'Edit Admin User' : 'Add Admin User'}</h2>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Full Name</span>
              <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Password {editAdmin && '(leave blank to keep)'}</span>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }} />
            </label>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Role</span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSubmit}
                style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                {editAdmin ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setShowCreate(false)}
                style={{ padding: '8px 16px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxHeight: '85vh', overflow: 'auto' };
