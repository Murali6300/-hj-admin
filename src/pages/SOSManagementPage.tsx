import { useEffect, useState } from 'react';
import api from '../api';

interface SOSAlert {
  id: number;
  rideId: number;
  userId: number;
  userName: string;
  driverId: number;
  driverName: string;
  latitude: number;
  longitude: number;
  status: string;
  adminNotes: string;
  alertedAt: string;
  acknowledgedAt: string;
  resolvedAt: string;
}

const STATUS_COLORS: Record<string, string> = { ACTIVE: '#F44336', ACKNOWLEDGED: '#FF9800', RESOLVED: '#4CAF50' };

export default function SOSManagementPage() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [resolveNotes, setResolveNotes] = useState<Record<number, string>>({});

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: 20 };
      if (filterStatus !== 'ALL') params.status = filterStatus;
      const res = await api.get('/sos', { params });
      setAlerts(res.data.content || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const fetchActiveCount = async () => {
    try {
      const res = await api.get('/sos/active-count');
      setActiveCount(res.data.activeCount || 0);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchAlerts(); fetchActiveCount(); }, [page, filterStatus]);

  const handleAcknowledge = async (id: number) => {
    await api.put(`/sos/${id}/acknowledge?adminId=1`);
    fetchAlerts();
    fetchActiveCount();
  };

  const handleResolve = async (id: number) => {
    await api.put(`/sos/${id}/resolve?adminId=1&notes=${encodeURIComponent(resolveNotes[id] || 'Resolved by admin')}`);
    fetchAlerts();
    fetchActiveCount();
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>SOS / Emergency Management</h1>

      {activeCount > 0 && (
        <div style={{ background: '#FFEBEE', border: '2px solid #F44336', borderRadius: 10, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>&#x26A0;</span>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#C62828' }}>HIGH PRIORITY</p>
            <p style={{ fontSize: 14, color: '#D32F2F' }}>{activeCount} active emergency alert(s) require attention</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map(s => (
          <button key={s} onClick={() => { setFilterStatus(s); setPage(0); }}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: filterStatus === s ? (s === 'ACTIVE' ? '#F44336' : s === 'ACKNOWLEDGED' ? '#FF9800' : s === 'RESOLVED' ? '#4CAF50' : '#1A73E8') : '#E0E0E0', color: filterStatus === s ? '#fff' : '#616161' }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <p style={{ color: '#757575', textAlign: 'center', padding: 40 }}>No SOS alerts found.</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${STATUS_COLORS[alert.status]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700 }}>Ride #{alert.rideId}</p>
                  <p style={{ fontSize: 13, color: '#757575' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${STATUS_COLORS[alert.status]}22`, color: STATUS_COLORS[alert.status] }}>{alert.status}</span>
                  </p>
                </div>
                <span style={{ fontSize: 12, color: '#757575' }}>{new Date(alert.alertedAt).toLocaleString('en-IN')}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 12 }}>
                <p><strong>User:</strong> {alert.userName} (ID: {alert.userId})</p>
                <p><strong>Driver:</strong> {alert.driverName} (ID: {alert.driverId})</p>
                <p><strong>Location:</strong> {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                <p><strong>Map:</strong> <a href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1A73E8' }}>Open in Maps</a></p>
              </div>

              {alert.adminNotes && (
                <p style={{ fontSize: 13, padding: 8, background: '#F5F5F5', borderRadius: 6, marginBottom: 12 }}><strong>Notes:</strong> {alert.adminNotes}</p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`tel:${alert.userId}`} style={{ padding: '8px 16px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                  Call User
                </a>
                {alert.driverId && (
                  <a href={`tel:${alert.driverId}`} style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                    Call Driver
                  </a>
                )}
                <button onClick={() => window.open('tel:112')} style={{ padding: '8px 16px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Notify Police
                </button>
                {alert.status === 'ACTIVE' && (
                  <button onClick={() => handleAcknowledge(alert.id)} style={{ padding: '8px 16px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Acknowledge
                  </button>
                )}
                {alert.status !== 'RESOLVED' && (
                  <>
                    <input type="text" placeholder="Resolution notes..." value={resolveNotes[alert.id] || ''} onChange={(e) => setResolveNotes({ ...resolveNotes, [alert.id]: e.target.value })} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, flex: 1 }} />
                    <button onClick={() => handleResolve(alert.id)} style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Mark Resolved
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
