import { useEffect, useState } from 'react';
import api from '../api';

interface Ride {
  id: number;
  userId: number;
  userName: string;
  driverId: number;
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
  createdAt: string;
  completedAt: string;
  cancelledAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: '#FF9800', ACCEPTED: '#2196F3', DRIVER_EN_ROUTE: '#9C27B0',
  DRIVER_ARRIVED: '#00BCD4', IN_PROGRESS: '#1A73E8', COMPLETED: '#4CAF50',
  CANCELLED: '#F44336',
};

export default function RideMonitoringPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [activeRides, setActiveRides] = useState<Ride[]>([]);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: 20 };
      if (filterStatus !== 'ALL') params.status = filterStatus;
      const res = await api.get('/rides', { params });
      setRides(res.data.content || []);
      setTotal(res.data.totalElements || 0);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const fetchActive = async () => {
    try {
      const res = await api.get('/rides/active');
      setActiveRides(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchRides(); fetchActive(); }, [page, filterStatus]);

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Live Ride Monitoring</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Active Rides" value={activeRides.length} color="#1A73E8" />
        <StatCard label="In Progress" value={activeRides.filter(r => r.status === 'IN_PROGRESS').length} color="#9C27B0" />
        <StatCard label="Awaiting Driver" value={activeRides.filter(r => r.status === 'REQUESTED').length} color="#FF9800" />
        <StatCard label="Total Rides" value={total} color="#388E3C" />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {['ALL', 'REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(0); }}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: filterStatus === s ? '#1A73E8' : '#E0E0E0',
              color: filterStatus === s ? '#fff' : '#616161',
            }}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading rides...</p>
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
              <th style={thStyle}>Fare</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rides.map((ride) => (
              <tr key={ride.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={tdStyle}>#{ride.id}</td>
                <td style={tdStyle}>{ride.userName}</td>
                <td style={tdStyle}>{ride.driverName}</td>
                <td style={tdStyle} title={ride.pickupAddress}>{truncate(ride.pickupAddress, 30)}</td>
                <td style={tdStyle} title={ride.dropoffAddress}>{truncate(ride.dropoffAddress, 30)}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${STATUS_COLORS[ride.status] || '#9E9E9E'}22`, color: STATUS_COLORS[ride.status] || '#9E9E9E' }}>
                    {ride.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={tdStyle}>{ride.actualFare ? `₹${ride.actualFare.toFixed(0)}` : ride.estimatedFare ? `~₹${ride.estimatedFare.toFixed(0)}` : '-'}</td>
                <td style={tdStyle}>{new Date(ride.createdAt).toLocaleString('en-IN')}</td>
                <td style={tdStyle}>
                  <button onClick={() => setSelectedRide(ride)} style={{ padding: '4px 10px', background: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={pageBtnStyle}>Previous</button>
        <span style={{ padding: '6px 12px', fontSize: 14 }}>Page {page + 1}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={rides.length < 20} style={{ ...pageBtnStyle, opacity: rides.length < 20 ? 0.5 : 1 }}>Next</button>
      </div>

      {selectedRide && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 30, maxWidth: 550, width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20 }}>Ride #{selectedRide.id}</h2>
              <button onClick={() => setSelectedRide(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>X</button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <p><strong>Status:</strong> <span style={{ color: STATUS_COLORS[selectedRide.status] }}>{selectedRide.status.replace('_', ' ')}</span></p>
              <p><strong>User:</strong> {selectedRide.userName} (ID: {selectedRide.userId})</p>
              <p><strong>Driver:</strong> {selectedRide.driverName} {selectedRide.driverId ? `(ID: ${selectedRide.driverId})` : ''}</p>
              <p><strong>Vehicle:</strong> {selectedRide.rideType}</p>
              <p><strong>Pickup:</strong> {selectedRide.pickupAddress}</p>
              <p><strong>Destination:</strong> {selectedRide.dropoffAddress}</p>
              <p><strong>Distance:</strong> {selectedRide.distanceKm ? `${selectedRide.distanceKm.toFixed(1)} km` : 'N/A'}</p>
              <p><strong>Duration:</strong> {selectedRide.durationMinutes ? `${selectedRide.durationMinutes} min` : 'N/A'}</p>
              <p><strong>Estimated Fare:</strong> ₹{selectedRide.estimatedFare?.toFixed(0) || 'N/A'}</p>
              <p><strong>Actual Fare:</strong> ₹{selectedRide.actualFare?.toFixed(0) || 'Pending'}</p>
              <p><strong>Surge:</strong> {selectedRide.surgeMultiplier}x</p>
              {selectedRide.cancellationReason && <p><strong>Cancellation Reason:</strong> {selectedRide.cancellationReason}</p>}
              {selectedRide.cancelledBy && <p><strong>Cancelled By:</strong> {selectedRide.cancelledBy}</p>}
              <p><strong>Created:</strong> {new Date(selectedRide.createdAt).toLocaleString('en-IN')}</p>
              {selectedRide.completedAt && <p><strong>Completed:</strong> {new Date(selectedRide.completedAt).toLocaleString('en-IN')}</p>}
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

function truncate(str: string, len: number) {
  return str && str.length > len ? str.substring(0, len) + '...' : str || '';
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const pageBtnStyle: React.CSSProperties = { padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' };
