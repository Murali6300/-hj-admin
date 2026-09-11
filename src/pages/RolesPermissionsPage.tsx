import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { isFullAccess } from '../utils/adminPermissions';
import CloseButton from '../components/CloseButton';
import CancelButton from '../components/CancelButton';

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
  ADMIN: '#1E88E5',
  SUPPORT: '#4CAF50',
  FINANCE: '#FF6D00',
  OPERATIONS: '#9C27B0',
};

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE', 'OPERATIONS'];

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function RolesPermissionsPage() {
  const fullAccess = isFullAccess();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [page, setPage] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'SUPPORT' });
  const [showPassword, setShowPassword] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = { page, size: 10 };
      if (filterRole) params.role = filterRole;
      const [listRes, statsRes] = await Promise.all([
        api.get('/admin-users', { params }),
        api.get('/admin-users', { params: { page: 0, size: 100 } }),
      ]);
      setAdmins(listRes.data.content || listRes.data || []);
      setTotalAdmins(listRes.data.totalElements ?? listRes.data.length ?? 0);
      setTotalPages(listRes.data.totalPages ?? 1);
      const counts: Record<string, number> = {};
      ROLES.forEach((r) => { counts[r] = 0; });
      const statsList = statsRes.data.content || statsRes.data || [];
      statsList.forEach((a: AdminUser) => { if (counts[a.role] !== undefined) counts[a.role] += 1; });
      setRoleCounts(counts);
    } catch {
      setError('Failed to load admin users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, filterRole]);

  useEffect(() => { setPage(0); }, [filterRole]);
  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const openCreate = () => {
    setEditAdmin(null);
    setForm({ email: '', password: '', fullName: '', role: 'SUPPORT' });
    setShowPassword(false);
    setShowCreate(true);
  };

  const openEdit = (a: AdminUser) => {
    setEditAdmin(a);
    setForm({ email: a.email, password: '', fullName: a.fullName, role: a.role });
    setShowPassword(false);
    setShowCreate(true);
  };

  const handleSubmit = async () => {
    const name = form.fullName.trim();
    if (!name) { alert('Full name is required.'); return; }
    if (!form.email.trim()) { alert('Email is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!editAdmin && !form.password) {
      alert('Password is required for new admin users.');
      return;
    }
    if (form.password && form.password.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    if (!ROLES.includes(form.role)) {
      alert('Please select a valid role.');
      return;
    }
    if (!confirm(editAdmin ? `Update admin "${name}"?` : `Create new admin "${name}"?`)) return;
    try {
      if (editAdmin) {
        const payload: any = { email: form.email.trim(), fullName: name, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/admin-users/${editAdmin.id}`, payload);
      } else {
        await api.post('/admin-users', { ...form, email: form.email.trim(), fullName: name });
      }
      setShowCreate(false);
      fetchAdmins();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save admin user.');
    }
  };

  const handleToggleActive = async (a: AdminUser) => {
    const msg = a.isActive
      ? `Deactivate admin "${a.fullName}"? They will not be able to log in until reactivated.`
      : `Activate admin "${a.fullName}"? They will be able to log in immediately.`;
    if (!confirm(msg)) return;
    try {
      await api.put(`/admin-users/${a.id}/toggle-active`);
      fetchAdmins();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to toggle account status.');
    }
  };

  const handleDelete = async (a: AdminUser) => {
    if (!confirm(`Permanently delete admin "${a.fullName}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin-users/${a.id}`);
      fetchAdmins();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete admin user.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>Roles & Permissions</h1>
        {fullAccess && (
          <button onClick={openCreate}
            style={{ padding: '8px 16px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            + Add Admin User
          </button>
        )}
      </div>

      {!fullAccess && (
        <div style={{ background: '#FFF3E0', color: '#E65100', padding: 12, borderRadius: 6, marginBottom: 20, fontSize: 13 }}>
          You have view-only access. Contact a Super Admin or Admin to manage admin users.
        </div>
      )}

      {error && (
        <div style={{ background: '#FFEBEE', color: '#B71C1C', padding: 12, borderRadius: 6, marginBottom: 20, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchAdmins}
            style={{ background: '#B71C1C', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
            Retry
          </button>
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
            <p style={{ fontSize: 20, fontWeight: 700, color: ROLE_COLORS[r] }}>{roleCounts[r] ?? 0}</p>
          </div>
        ))}
      </div>

      {loading && admins.length === 0 ? <p>Loading...</p> : admins.length === 0 && !error ? (
        <p style={{ color: '#757575' }}>No admin users found</p>
      ) : (
        <>
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
                      <button onClick={() => handleToggleActive(a)}
                        style={{ marginRight: 6, padding: '4px 10px', background: a.isActive ? '#FF6D00' : '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                        {a.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleDelete(a)}
                        style={{ padding: '4px 10px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {totalAdmins > 10 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: '#616161' }}>
              <span>
                Showing {page * 10 + 1}–{Math.min((page + 1) * 10, totalAdmins)} of {totalAdmins}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, background: page === 0 ? '#f5f5f5' : '#fff', color: page === 0 ? '#bbb' : '#333', cursor: page === 0 ? 'default' : 'pointer', fontSize: 12 }}>
                  Prev
                </button>
                <span style={{ lineHeight: '32px', fontSize: 12 }}>Page {page + 1} of {totalPages}</span>
                <button disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, background: page + 1 >= totalPages ? '#f5f5f5' : '#fff', color: page + 1 >= totalPages ? '#bbb' : '#333', cursor: page + 1 >= totalPages ? 'default' : 'pointer', fontSize: 12 }}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{editAdmin ? 'Edit Admin User' : 'Add Admin User'}</h2>
              <CloseButton onClick={() => setShowCreate(false)} />
            </div>
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
              <div style={{ position: 'relative', marginTop: 4 }}>
                <input type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: 8, paddingRight: 36, border: '1px solid #ddd', borderRadius: 4 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#757575', padding: 2, display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
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
              <CancelButton onClick={() => setShowCreate(false)} />
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
