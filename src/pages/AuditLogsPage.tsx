import { useEffect, useState } from 'react';
import api from '../api';

interface AuditLog {
  id: number;
  adminId: number;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: number;
  oldValue: string;
  newValue: string;
  ipAddress: string;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  COUPON_CREATE: '#4CAF50',
  COUPON_UPDATE: '#FFC107',
  COUPON_DELETE: '#F44336',
  WALLET_ADJUST: '#1A73E8',
  ADMIN_USER_CREATE: '#9C27B0',
  ADMIN_USER_UPDATE: '#FF6D00',
  ADMIN_USER_DELETE: '#F44336',
  ADMIN_USER_TOGGLE: '#00BCD4',
  DRIVER_APPROVE: '#4CAF50',
  DRIVER_REJECT: '#F44336',
  SOS_ACKNOWLEDGE: '#FF6D00',
  SOS_RESOLVE: '#4CAF50',
  TICKET_ASSIGN: '#1A73E8',
  TICKET_RESOLVE: '#4CAF50',
  CONFIG_UPDATE: '#FFC107',
  PAYMENT_REFUND: '#FF6D00',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [todayCount, setTodayCount] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let res;
      if (filterAction) {
        res = await api.get(`/audit-logs/action/${filterAction}`, { params: { page, size: 50 } });
      } else if (filterEntity) {
        res = await api.get(`/audit-logs/entity/${filterEntity}`, { params: { page, size: 50 } });
      } else {
        res = await api.get('/audit-logs', { params: { page, size: 50 } });
      }
      setLogs(res.data.content || res.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const fetchTodayCount = async () => {
    try { const res = await api.get('/audit-logs/today-count'); setTodayCount(res.data); } catch { /* ignore */ }
  };

  useEffect(() => { fetchLogs(); }, [page, filterAction, filterEntity]);
  useEffect(() => { fetchTodayCount(); }, []);

  const handleExport = () => {
    const csv = [
      'ID,Admin Email,Action,Entity Type,Entity ID,Old Value,New Value,IP Address,Created At',
      ...logs.map(l => `${l.id},"${l.adminEmail}",${l.action},${l.entityType},${l.entityId},"${l.oldValue || ''}","${l.newValue || ''}",${l.ipAddress || ''},${l.createdAt}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>Audit Logs</h1>
        <button onClick={handleExport}
          style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Export CSV
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 24, borderLeft: '4px solid #FF6D00', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: 13, color: '#757575', marginBottom: 4 }}>Today's Actions</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#FF6D00' }}>{todayCount}</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setFilterEntity(''); setPage(0); }}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setFilterAction(''); setPage(0); }}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
          <option value="">All Entities</option>
          <option value="COUPON">Coupon</option>
          <option value="WALLET">Wallet</option>
          <option value="ADMIN_USER">Admin User</option>
          <option value="SOS_ALERT">SOS Alert</option>
          <option value="SUPPORT_TICKET">Support Ticket</option>
          <option value="SYSTEM_CONFIG">System Config</option>
          <option value="DRIVER">Driver</option>
        </select>
      </div>

      {loading ? <p>Loading...</p> : logs.length === 0 ? (
        <p style={{ color: '#757575' }}>No audit logs found</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Admin</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Entity</th>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Old Value</th>
                <th style={thStyle}>New Value</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ ...tdStyle, color: '#757575', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td style={tdStyle}>{log.adminEmail || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#fff', background: ACTION_COLORS[log.action] || '#9E9E9E' }}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={tdStyle}>{log.entityType || '-'}</td>
                  <td style={tdStyle}>{log.entityId || '-'}</td>
                  <td style={{ ...tdStyle, color: '#F44336', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.oldValue || '-'}</td>
                  <td style={{ ...tdStyle, color: '#4CAF50', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.newValue || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>
              Previous
            </button>
            <span style={{ padding: '6px 12px', fontSize: 14 }}>Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 50}
              style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: logs.length < 50 ? 'not-allowed' : 'pointer', opacity: logs.length < 50 ? 0.5 : 1 }}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
