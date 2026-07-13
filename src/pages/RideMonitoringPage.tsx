import { useEffect, useState } from 'react';
import api from '../api';
import { getVehicleIcon } from '../utils/vehicleIcons';

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
  paymentStatus: string;
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
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const fetchActive = async () => {
    try { const res = await api.get('/rides/active'); setActiveRides(res.data); } catch { /* ignore */ }
  };

  useEffect(() => { fetchRides(); fetchActive(); }, [page, filterStatus]);

  const handleCancelRide = async (rideId: number) => {
    if (!confirm('Force cancel this ride?')) return;
    try { await api.post(`/rides/${rideId}/cancel`, { reason: 'Admin cancelled' }); fetchRides(); fetchActive(); } catch { alert('Failed to cancel ride'); }
  };

  const handleRefund = async (rideId: number) => {
    if (!confirm('Process refund for this ride?')) return;
    try {
      const payRes = await api.get(`/payments/ride/${rideId}`);
      if (payRes.data?.paymentId) {
        await api.post(`/payments/${payRes.data.paymentId}/refund`, { reason: 'Admin-initiated refund' });
        alert('Refund processed'); fetchRides();
      } else { alert('No payment found'); }
    } catch { alert('Failed to process refund'); }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Live Ride Monitoring</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Active Rides" value={activeRides.length} color="#1A73E8" />
        <StatCard label="In Progress" value={activeRides.filter(r => r.status === 'IN_PROGRESS').length} color="#9C27B0" />
        <StatCard label="Awaiting Driver" value={activeRides.filter(r => r.status === 'REQUESTED').length} color="#FF9800" />
        <StatCard label="Total Rides" value={total} color="#388E3C" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['ALL', 'REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => { setFilterStatus(s); setPage(0); }}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: filterStatus === s ? '#1A73E8' : '#E0E0E0', color: filterStatus === s ? '#fff' : '#616161' }}>
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? <p>Loading rides...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>Ride ID</th>
              <th style={thStyle}>Type</th>
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
                <td style={tdStyle}>{getVehicleIcon(ride.rideType)} {ride.rideType}</td>
                <td style={tdStyle}>{ride.userName}</td>
                <td style={tdStyle}>{ride.driverName || '-'}</td>
                <td style={tdStyle} title={ride.pickupAddress}>{truncate(ride.pickupAddress, 25)}</td>
                <td style={tdStyle} title={ride.dropoffAddress}>{truncate(ride.dropoffAddress, 25)}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${STATUS_COLORS[ride.status] || '#9E9E9E'}22`, color: STATUS_COLORS[ride.status] || '#9E9E9E' }}>
                    {ride.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={tdStyle}>{ride.actualFare ? `₹${ride.actualFare.toFixed(0)}` : ride.estimatedFare ? `~₹${ride.estimatedFare.toFixed(0)}` : '-'}</td>
                <td style={tdStyle}>{new Date(ride.createdAt).toLocaleDateString('en-IN')}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => setSelectedRide(ride)} style={{ padding: '4px 8px', background: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Details</button>
                    {(ride.status === 'REQUESTED' || ride.status === 'ACCEPTED') && (
                      <button onClick={() => handleCancelRide(ride.id)} style={{ padding: '4px 8px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                    )}
                    {ride.status === 'COMPLETED' && ride.paymentStatus !== 'REFUNDED' && (
                      <button onClick={() => handleRefund(ride.id)} style={{ padding: '4px 8px', background: '#FF6D00', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Refund</button>
                    )}
                  </div>
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
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>Ride #{selectedRide.id}</h2>
              <button onClick={() => setSelectedRide(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, lineHeight: 1.8 }}>
              <InfoBlock label="Status" value={selectedRide.status.replace('_', ' ')} color={STATUS_COLORS[selectedRide.status]} />
              <InfoBlock label="Vehicle" value={`${getVehicleIcon(selectedRide.rideType)} ${selectedRide.rideType}`} />
              <InfoBlock label="User" value={`${selectedRide.userName} (ID: ${selectedRide.userId})`} />
              <InfoBlock label="Driver" value={selectedRide.driverName ? `${selectedRide.driverName} (ID: ${selectedRide.driverId})` : 'Unassigned'} />
              <InfoBlock label="Pickup" value={selectedRide.pickupAddress} />
              <InfoBlock label="Destination" value={selectedRide.dropoffAddress} />
              <InfoBlock label="Distance" value={selectedRide.distanceKm ? `${selectedRide.distanceKm.toFixed(1)} km` : 'N/A'} />
              <InfoBlock label="Duration" value={selectedRide.durationMinutes ? `${selectedRide.durationMinutes} min` : 'N/A'} />
              <InfoBlock label="Estimated Fare" value={`₹${selectedRide.estimatedFare?.toFixed(0) || 'N/A'}`} />
              <InfoBlock label="Actual Fare" value={selectedRide.actualFare ? `₹${selectedRide.actualFare.toFixed(0)}` : 'Pending'} />
              <InfoBlock label="Surge" value={`${selectedRide.surgeMultiplier}x`} />
              <InfoBlock label="Payment" value={selectedRide.paymentStatus || 'N/A'} />
              <InfoBlock label="Created" value={new Date(selectedRide.createdAt).toLocaleString('en-IN')} />
              {selectedRide.completedAt && <InfoBlock label="Completed" value={new Date(selectedRide.completedAt).toLocaleString('en-IN')} />}
              {selectedRide.cancellationReason && <InfoBlock label="Cancel Reason" value={selectedRide.cancellationReason} />}
              {selectedRide.cancelledBy && <InfoBlock label="Cancelled By" value={selectedRide.cancelledBy} />}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, borderTop: '1px solid #E0E0E0', paddingTop: 16 }}>
              <button onClick={() => setSelectedRide(null)} style={{ padding: '8px 16px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Close</button>
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

function InfoBlock({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '6px 10px', background: '#f9f9f9', borderRadius: 4 }}>
      <span style={{ fontSize: 11, color: '#757575' }}>{label}: </span>
      <span style={{ fontWeight: 600, color: color || '#333' }}>{value}</span>
    </div>
  );
}

function truncate(str: string, len: number) { return str && str.length > len ? str.substring(0, len) + '...' : str || ''; }

const thStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 12, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '8px 14px', fontSize: 12 };
const pageBtnStyle: React.CSSProperties = { padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxHeight: '85vh', overflow: 'auto' };
