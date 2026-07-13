import { useEffect, useState } from 'react';
import api from '../api';

interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  accountStatus: string;
  rating?: number;
  walletBalance?: number;
  rideCount?: number;
  profileUrl?: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [viewUser, setViewUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (search.trim()) {
        const res = await api.get(`/users/search?q=${encodeURIComponent(search)}`);
        setUsers(res.data);
      } else {
        const res = await api.get('/users');
        setUsers(res.data);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBlock = async (id: number) => {
    if (!confirm('Suspend this user?')) return;
    await api.put(`/users/${id}/block`);
    fetchUsers();
  };

  const handleUnblock = async (id: number) => {
    await api.put(`/users/${id}/unblock`);
    fetchUsers();
  };

  const handleResetPassword = async (id: number) => {
    if (!confirm('Reset this user password to default (HJ@12345)?')) return;
    const res = await api.put(`/users/${id}/reset-password`);
    alert(res.data.message);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('PERMANENTLY delete this user? This cannot be undone.')) return;
    await api.delete(`/users/${id}`);
    fetchUsers();
  };

  const filteredUsers = users.filter(u => filterStatus === 'ALL' || u.accountStatus === filterStatus);

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>User Management</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search by name, email, or phone..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, minWidth: 300 }} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button onClick={fetchUsers} style={{ padding: '8px 16px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Search</button>
      </div>

      {loading ? <p>Loading users...</p> : filteredUsers.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#757575' }}>No users found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Registered</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={tdStyle}>{user.id}</td>
                <td style={tdStyle}>{user.name}</td>
                <td style={tdStyle}>{user.email}</td>
                <td style={tdStyle}>{user.phoneNumber}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: user.accountStatus === 'ACTIVE' ? '#E8F5E9' : '#FFEBEE', color: user.accountStatus === 'ACTIVE' ? '#2E7D32' : '#C62828' }}>
                    {user.accountStatus}
                  </span>
                </td>
                <td style={tdStyle}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => setViewUser(user)} style={{ padding: '6px 12px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>View</button>
                    {user.accountStatus === 'ACTIVE' ? (
                      <button onClick={() => handleBlock(user.id)} style={btnDanger}>Suspend</button>
                    ) : (
                      <button onClick={() => handleUnblock(user.id)} style={btnSuccess}>Activate</button>
                    )}
                    <button onClick={() => handleResetPassword(user.id)} style={btnWarn}>Reset PW</button>
                    <button onClick={() => handleDelete(user.id)} style={{ ...btnDanger, background: '#B71C1C' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {viewUser && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>User Details</h2>
              <button onClick={() => setViewUser(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#1A73E8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 700 }}>
                {viewUser.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{viewUser.name}</p>
                <p style={{ fontSize: 13, color: '#757575', margin: '4px 0 0' }}>{viewUser.email}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InfoItem label="Phone" value={viewUser.phoneNumber} />
              <InfoItem label="Status" value={viewUser.accountStatus} color={viewUser.accountStatus === 'ACTIVE' ? '#4CAF50' : '#F44336'} />
              <InfoItem label="Rating" value={viewUser.rating ? `⭐ ${viewUser.rating.toFixed(1)}` : 'No ratings yet'} />
              <InfoItem label="Wallet Balance" value={viewUser.walletBalance != null ? `₹${viewUser.walletBalance.toLocaleString()}` : 'N/A'} />
              <InfoItem label="Total Rides" value={String(viewUser.rideCount || 0)} />
              <InfoItem label="Registered" value={new Date(viewUser.createdAt).toLocaleDateString('en-IN')} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, borderTop: '1px solid #E0E0E0', paddingTop: 16 }}>
              <button onClick={() => { setViewUser(null); }} style={{ padding: '8px 16px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #E0E0E0' }}>
      <p style={{ fontSize: 11, color: '#757575', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 0', color: color || '#333' }}>{value}</p>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const btnDanger: React.CSSProperties = { padding: '6px 12px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
const btnSuccess: React.CSSProperties = { padding: '6px 12px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
const btnWarn: React.CSSProperties = { padding: '6px 12px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxHeight: '85vh', overflow: 'auto' };
