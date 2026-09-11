import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { formatINR } from '../utils/formatCurrency';

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [userInput, setUserInput] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [driverInput, setDriverInput] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const pageSize = 20;
  const [refundId, setRefundId] = useState<number | null>(null);

  const fetchCancelled = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { status: 'CANCELLED', page, size: pageSize, sortBy, sortDir };
      if (search.trim()) params.search = search.trim();
      if (userFilter.trim()) params.userName = userFilter.trim();
      if (driverFilter.trim()) params.driverName = driverFilter.trim();
      const res = await api.get('/rides', { params });
      setCancelledRides(res.data.content || []);
      setTotal(res.data.totalElements || 0);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, search, userFilter, driverFilter, sortBy, sortDir]);

  useEffect(() => { fetchCancelled(); }, [fetchCancelled]);

  const handleSearch = () => {
    setPage(0);
    setSearch(searchInput);
    setUserFilter(userInput);
    setDriverFilter(driverInput);
  };

  const handleSearchInputChange = (e: { target: { value: string } }) => {
    const v = e.target.value;
    setSearchInput(v);
    if (v.trim() === '' && search.trim() !== '') {
      setSearch('');
      setPage(0);
    }
  };

  const handleUserFilter = () => {
    setPage(0);
    setUserFilter(userInput);
  };

  const handleUserInputChange = (e: { target: { value: string } }) => {
    const v = e.target.value;
    setUserInput(v);
    if (v.trim() === '' && userFilter.trim() !== '') {
      setUserFilter('');
      setPage(0);
    }
  };

  const handleDriverFilter = () => {
    setPage(0);
    setDriverFilter(driverInput);
  };

  const handleDriverInputChange = (e: { target: { value: string } }) => {
    const v = e.target.value;
    setDriverInput(v);
    if (v.trim() === '' && driverFilter.trim() !== '') {
      setDriverFilter('');
      setPage(0);
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setUserInput('');
    setUserFilter('');
    setDriverInput('');
    setDriverFilter('');
    setPage(0);
  };

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
          <p style={{ fontSize: 24, fontWeight: 700, color: '#F44336' }}>{total}</p>
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

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search ride ID, pickup or dropoff..." value={searchInput}
          onChange={handleSearchInputChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, flexGrow: 1, minWidth: 220 }} />
        <input type="text" placeholder="User name or phone..." value={userInput}
          onChange={handleUserInputChange}
          onKeyDown={(e) => e.key === 'Enter' && handleUserFilter()}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, width: 180 }} />
        <input type="text" placeholder="Driver name or phone..." value={driverInput}
          onChange={handleDriverInputChange}
          onKeyDown={(e) => e.key === 'Enter' && handleDriverFilter()}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, width: 180 }} />
        <button onClick={handleSearch}
          style={{ padding: '8px 16px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
          Search
        </button>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
          <option value="createdAt">Date</option>
          <option value="actualFare">Fare</option>
          <option value="status">Status</option>
        </select>
        <button onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(0); }}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: '#fff' }}>
          {sortDir === 'desc' ? 'Newest First' : 'Oldest First'}
        </button>
        <span style={{ fontSize: 13, color: '#757575' }}>{total} cancelled rides</span>
        {(search.trim() !== '' || userFilter.trim() !== '' || driverFilter.trim() !== '') && (
          <button onClick={handleClearFilters}
            style={{ padding: '8px 16px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            Clear Filters
          </button>
        )}
        {userFilter.trim() !== '' && (
          <span style={{ fontSize: 12, color: '#FF9800' }}>User: {userFilter}</span>
        )}
        {driverFilter.trim() !== '' && (
          <span style={{ fontSize: 12, color: '#9C27B0' }}>Driver: {driverFilter}</span>
        )}
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
                <td style={tdStyle}>{ride.actualFare != null ? formatINR(ride.actualFare, 0) : '0'}</td>
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
        <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= total} style={{ ...pageBtnStyle, opacity: (page + 1) * pageSize >= total ? 0.5 : 1 }}>Next</button>
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
