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
  actualFare: number;
  cancellationReason: string;
  cancelledBy: string;
  createdAt: string;
  cancelledAt: string;
}

interface Payment {
  paymentId: number;
  rideId: number;
  totalFare: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}

export default function CancellationManagementPage() {
  const [cancelledRides, setCancelledRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [refundId, setRefundId] = useState<number | null>(null);

  const fetchCancelled = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rides', { params: { status: 'CANCELLED', page, size: 20 } });
      setCancelledRides(res.data.content || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCancelled(); }, [page]);

  const handleRefund = async (rideId: number) => {
    if (!confirm('Process a refund for this cancelled ride? The full fare will be returned to the user.')) return;
    try {
      const payRes = await api.get(`/payments/ride/${rideId}`);
      const payment = payRes.data;
      if (payment && payment.paymentStatus === 'SUCCESS') {
        await api.post(`/payments/${payment.paymentId}/refund`, { reason: 'Admin-processed refund for cancelled ride' });
        alert('Refund processed successfully');
        fetchCancelled();
      } else {
        alert('No successful payment found for this ride');
      }
    } catch {
      alert('Failed to process refund');
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Ride Cancellation Management</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, borderLeft: '4px solid #F44336', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 12, color: '#757575' }}>Total Cancelled</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#F44336' }}>{cancelledRides.length}</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, borderLeft: '4px solid #FF9800', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 12, color: '#757575' }}>User Cancelled</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#FF9800' }}>{cancelledRides.filter(r => r.cancelledBy === 'USER').length}</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, borderLeft: '4px solid #9C27B0', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 12, color: '#757575' }}>Driver Cancelled</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#9C27B0' }}>{cancelledRides.filter(r => r.cancelledBy === 'DRIVER').length}</p>
        </div>
      </div>

      {loading ? (
        <p>Loading cancelled rides...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>Ride ID</th>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Pickup</th>
              <th style={thStyle}>Destination</th>
              <th style={thStyle}>Cancelled By</th>
              <th style={thStyle}>Reason</th>
              <th style={thStyle}>Fare</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cancelledRides.map((ride) => (
              <tr key={ride.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={tdStyle}>#{ride.id}</td>
                <td style={tdStyle}>{ride.userName}</td>
                <td style={tdStyle}>{ride.driverName || 'Unassigned'}</td>
                <td style={tdStyle}>{truncate(ride.pickupAddress, 25)}</td>
                <td style={tdStyle}>{truncate(ride.dropoffAddress, 25)}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: ride.cancelledBy === 'USER' ? '#FFF3E0' : '#F3E5F5', color: ride.cancelledBy === 'USER' ? '#E65100' : '#880E4F' }}>
                    {ride.cancelledBy || 'Unknown'}
                  </span>
                </td>
                <td style={tdStyle} title={ride.cancellationReason}>{truncate(ride.cancellationReason, 30) || 'No reason'}</td>
                <td style={tdStyle}>₹{ride.actualFare?.toFixed(0) || '0'}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleRefund(ride.id)} style={{ padding: '4px 10px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                    Process Refund
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
        <button onClick={() => setPage(p => p + 1)} disabled={cancelledRides.length < 20} style={{ ...pageBtnStyle, opacity: cancelledRides.length < 20 ? 0.5 : 1 }}>Next</button>
      </div>
    </div>
  );
}

function truncate(str: string, len: number) {
  return str && str.length > len ? str.substring(0, len) + '...' : str || '';
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const pageBtnStyle: React.CSSProperties = { padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' };
