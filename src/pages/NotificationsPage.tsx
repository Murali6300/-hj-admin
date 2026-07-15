import { useEffect, useState } from 'react';
import api from '../api';

interface Notification {
  id: number;
  title: string;
  body: string;
  targetRole: string;
  targetType: string;
  recipientCount: number;
  sentAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetRole, setTargetRole] = useState('ALL');
  const [targetType, setTargetType] = useState('PUSH');
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(0);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { page, size: 20 } });
      setNotifications(res.data.content || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [page]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { alert('Title and message are required'); return; }
    if (!confirm(`Send ${targetType} notification to ${targetRole === 'ALL' ? 'all users' : targetRole}?`)) return;
    try {
      await api.post('/notifications?adminId=1', { title, body, targetRole, targetType });
      alert('Notification sent successfully!');
      setTitle('');
      setBody('');
      fetchNotifications();
    } catch { alert('Failed to send notification'); } finally { setSending(false); }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Notifications Management</h1>

      <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Send New Notification</h2>

        <div style={{ display: 'grid', gap: 12 }}>
          <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
            style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 6, fontSize: 14 }} />

          <textarea placeholder="Message body..." value={body} onChange={(e) => setBody(e.target.value)} rows={3}
            style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 6, fontSize: 14, resize: 'vertical' }} />

          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ fontSize: 13 }}>
              Target Audience:
              <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
                style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd' }}>
                <option value="ALL">All (Users + Drivers)</option>
                <option value="USER">Users Only</option>
                <option value="DRIVER">Drivers Only</option>
              </select>
            </label>

            <label style={{ fontSize: 13 }}>
              Channel:
              <select value={targetType} onChange={(e) => setTargetType(e.target.value)}
                style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd' }}>
                <option value="PUSH">Push Notification</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
                <option value="ALL">All Channels</option>
              </select>
            </label>
          </div>

          <button onClick={handleSend} disabled={sending}
            style={{ padding: '10px 20px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: sending ? 0.7 : 1, alignSelf: 'flex-start' }}>
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Sent Notifications</h2>

      {loading ? (
        <p>Loading...</p>
      ) : notifications.length === 0 ? (
        <p style={{ color: '#757575' }}>No notifications sent yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Body</th>
              <th style={thStyle}>Audience</th>
              <th style={thStyle}>Channel</th>
              <th style={thStyle}>Recipients</th>
              <th style={thStyle}>Sent At</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map(n => (
              <tr key={n.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={tdStyle}><strong>{n.title}</strong></td>
                <td style={tdStyle} title={n.body}>{n.body.length > 50 ? n.body.substring(0, 50) + '...' : n.body}</td>
                <td style={tdStyle}>{n.targetRole}</td>
                <td style={tdStyle}>{n.targetType}</td>
                <td style={tdStyle}>{n.recipientCount}</td>
                <td style={tdStyle}>{new Date(n.sentAt).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
