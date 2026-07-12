import { useEffect, useState } from 'react';
import api from '../api';

interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  accountStatus: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

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
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = () => fetchUsers();

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

  const filteredUsers = users.filter(u => {
    if (filterStatus !== 'ALL' && u.accountStatus !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>User Management</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, minWidth: 300 }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button onClick={handleSearch} style={{ padding: '8px 16px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Search
        </button>
      </div>

      {loading ? (
        <p>Loading users...</p>
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
                  <div style={{ display: 'flex', gap: 6 }}>
                    {user.accountStatus === 'ACTIVE' ? (
                      <button onClick={() => handleBlock(user.id)} style={btnDanger}>Suspend</button>
                    ) : (
                      <button onClick={() => handleUnblock(user.id)} style={btnSuccess}>Activate</button>
                    )}
                    <button onClick={() => handleResetPassword(user.id)} style={btnWarn}>Reset Password</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {filteredUsers.length === 0 && !loading && <p style={{ textAlign: 'center', padding: 40, color: '#757575' }}>No users found.</p>}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const btnDanger: React.CSSProperties = { padding: '6px 12px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
const btnSuccess: React.CSSProperties = { padding: '6px 12px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
const btnWarn: React.CSSProperties = { padding: '6px 12px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
