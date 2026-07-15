import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface Ride {
  id: number;
  userId: number;
  userName: string;
  driverId: number | null;
  driverName: string;
  pickupAddress: string;
  dropoffAddress: string;
  rideType: string;
  status: string;
  estimatedFare: number;
  actualFare: number;
  distanceKm: number;
  durationMinutes: number;
  surgeMultiplier: number;
  cancellationReason: string;
  cancelledBy: string;
  paymentStatus: string;
  createdAt: string;
  completedAt: string;
  cancelledAt: string;
}

interface RideStats {
  activeRides: number;
  completedToday: number;
  cancelledToday: number;
  totalRides: number;
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: '#FF9800',
  ACCEPTED: '#2196F3',
  DRIVER_EN_ROUTE: '#9C27B0',
  DRIVER_ARRIVED: '#00BCD4',
  IN_PROGRESS: '#1A73E8',
  COMPLETED: '#4CAF50',
  CANCELLED: '#F44336',
  NO_DRIVERS_AVAILABLE: '#757575',
};

const REFRESH_INTERVAL = 15000;

function getEta(ride: Ride): string {
  switch (ride.status) {
    case 'REQUESTED':
      return 'Awaiting driver';
    case 'ACCEPTED': {
      if (!ride.createdAt) return 'Assigned';
      const mins = Math.round((Date.now() - new Date(ride.createdAt).getTime()) / 60000);
      return `Assigned ${mins}m ago`;
    }
    case 'DRIVER_EN_ROUTE':
      return 'Driver en route';
    case 'DRIVER_ARRIVED':
      return 'At pickup';
    case 'IN_PROGRESS': {
      if (ride.durationMinutes) return `~${ride.durationMinutes} min left`;
      return 'In progress';
    }
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return '—';
  }
}

export default function RideMonitoringPage() {
  const navigate = useNavigate();
  const [activeRides, setActiveRides] = useState<Ride[]>([]);
  const [stats, setStats] = useState<RideStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [cancelModalRide, setCancelModalRide] = useState<Ride | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLiveData = useCallback(async () => {
    try {
      const [activeRes, statsRes] = await Promise.all([
        api.get('/rides/active'),
        api.get('/rides/stats'),
      ]);
      setActiveRides(activeRes.data || []);
      setStats(statsRes.data);
      setLastUpdated(new Date());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLiveData, REFRESH_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchLiveData]);

  const handleCancelRide = async () => {
    if (!cancelModalRide) return;
    try {
      await api.post(`/rides/${cancelModalRide.id}/cancel`, {
        reason: cancelReason || 'Cancelled by admin',
      });
      setCancelModalRide(null);
      setCancelReason('');
      fetchLiveData();
    } catch {
      alert('Failed to cancel ride');
    }
  };

  const handleReassign = async (rideId: number) => {
    if (!confirm('Reassign this ride to a different driver?')) return;
    try {
      await api.post(`/rides/${rideId}/reassign`);
      fetchLiveData();
    } catch {
      alert('Failed to reassign ride');
    }
  };

  const inProgressCount = activeRides.filter((r) => r.status === 'IN_PROGRESS').length;
  const requestedCount = activeRides.filter((r) => r.status === 'REQUESTED').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Live Rides</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#757575' }}>
            Auto-refreshing every 15s • Last updated: {lastUpdated.toLocaleTimeString('en-IN')}
          </p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          style={{
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: autoRefresh ? '#4CAF50' : '#9E9E9E',
            color: '#fff',
          }}
        >
          {autoRefresh ? '⏸ Pause' : '▶ Resume'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Active Rides" value={stats?.activeRides ?? activeRides.length} color="#1A73E8" />
        <StatCard label="In Progress" value={stats?.activeRides != null ? inProgressCount : activeRides.filter((r) => r.status === 'IN_PROGRESS').length} color="#9C27B0" />
        <StatCard label="Awaiting Driver" value={requestedCount} color="#FF9800" />
        <StatCard label="Completed Today" value={stats?.completedToday ?? 0} color="#4CAF50" />
      </div>

      {/* Live Rides Table */}
      {loading ? (
        <p style={{ fontSize: 14, color: '#757575' }}>Loading rides...</p>
      ) : activeRides.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 10 }}>
          <p style={{ fontSize: 16, color: '#757575' }}>No active rides right now</p>
          <p style={{ fontSize: 13, color: '#9E9E9E' }}>Rides will appear here when users book</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>Ride ID</th>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Pickup</th>
              <th style={thStyle}>Destination</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>ETA</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeRides.map((ride) => (
              <tr key={ride.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={tdStyle}>
                  <span style={{ cursor: 'pointer', color: '#1565C0', fontWeight: 600 }} onClick={() => navigate(`/rides/${ride.id}`)}>
                    #{ride.id}
                  </span>
                </td>
                <td style={tdStyle}>{ride.userName}</td>
                <td style={tdStyle}>{ride.driverName !== 'Unassigned' ? ride.driverName : <span style={{ color: '#9E9E9E' }}>Unassigned</span>}</td>
                <td style={tdStyle} title={ride.pickupAddress}>{truncate(ride.pickupAddress, 25)}</td>
                <td style={tdStyle} title={ride.dropoffAddress}>{truncate(ride.dropoffAddress, 25)}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    background: `${STATUS_COLORS[ride.status] || '#9E9E9E'}22`,
                    color: STATUS_COLORS[ride.status] || '#9E9E9E',
                  }}>
                    {ride.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontSize: 11, color: '#757575' }}>{getEta(ride)}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <ActionBtn color="#1565C0" label="Track" onClick={() => navigate(`/rides/${ride.id}`)} />
                    {ride.driverName !== 'Unassigned' && (
                      <ActionBtn color="#9C27B0" label="Call Driver" onClick={() => window.open(`tel:${ride.driverId}`, '_self')} />
                    )}
                    <ActionBtn color="#4CAF50" label="Call User" onClick={() => window.open(`tel:${ride.userId}`, '_self')} />
                    {(ride.status === 'REQUESTED' || ride.status === 'ACCEPTED' || ride.status === 'DRIVER_EN_ROUTE' || ride.status === 'DRIVER_ARRIVED') && (
                      <ActionBtn color="#F44336" label="Cancel" onClick={() => setCancelModalRide(ride)} />
                    )}
                    {(ride.status === 'ACCEPTED' || ride.status === 'DRIVER_EN_ROUTE') && (
                      <ActionBtn color="#FF6D00" label="Reassign" onClick={() => handleReassign(ride.id)} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Cancel Modal */}
      {cancelModalRide && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Cancel Ride #{cancelModalRide.id}</h2>
              <button onClick={() => setCancelModalRide(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: '#757575', marginBottom: 12 }}>
              This will force-cancel the ride. The driver and user will be notified.
            </p>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Reason</label>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Safety concern, driver unresponsive..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, marginTop: 4, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setCancelModalRide(null)} style={{ padding: '8px 16px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Go Back</button>
              <button onClick={handleCancelRide} style={{ padding: '8px 16px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, borderLeft: `4px solid ${color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <p style={{ fontSize: 12, color: '#757575', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

function ActionBtn({ color, label, onClick }: { color: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 8px',
        background: `${color}18`,
        color,
        border: 'none',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function truncate(str: string, len: number) {
  return str && str.length > len ? str.substring(0, len) + '...' : str || '';
}

const thStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 12, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '8px 14px', fontSize: 12 };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxHeight: '85vh', overflow: 'auto' };
