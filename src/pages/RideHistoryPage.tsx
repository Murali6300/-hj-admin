import { useEffect, useState, useCallback } from 'react';
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
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string;
  createdAt: string;
  completedAt: string;
  cancelledAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: '#FF9800',
  ACCEPTED: '#2196F3',
  DRIVER_EN_ROUTE: '#9C27B0',
  DRIVER_ARRIVED: '#00BCD4',
  IN_PROGRESS: '#1E88E5',
  COMPLETED: '#4CAF50',
  CANCELLED: '#F44336',
  NO_DRIVERS_AVAILABLE: '#757575',
};

const PAYMENT_COLORS: Record<string, string> = {
  SUCCESS: '#4CAF50',
  PENDING: '#FFC107',
  FAILED: '#F44336',
  CANCELLED: '#9E9E9E',
};

const STATUS_OPTIONS = ['ALL', 'COMPLETED', 'CANCELLED', 'REQUESTED', 'ACCEPTED', 'IN_PROGRESS'];
const PAYMENT_METHODS = ['ALL', 'CASH', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'CARD', 'WALLET'];
const SORT_FIELDS = [
  { value: 'createdAt', label: 'Date' },
  { value: 'actualFare', label: 'Fare' },
];

export default function RideHistoryPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Detail modal
  const [detailRide, setDetailRide] = useState<Ride | null>(null);

  const fetchRides = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: page - 1, size: PAGE_SIZE, sortDir };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (paymentMethodFilter !== 'ALL') params.paymentMethod = paymentMethodFilter;
      if (search.trim()) params.search = search.trim();
      if (fromDate) params.fromDate = new Date(fromDate).toISOString();
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        params.toDate = to.toISOString();
      }
      if (sortBy) params.sortBy = sortBy;

      const res = await api.get('/rides', { params });
      setRides(res.data.content || []);
      setTotal(res.data.totalElements || 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, paymentMethodFilter, search, fromDate, toDate, sortBy, sortDir]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPaymentMethodFilter('ALL');
    setFromDate('');
    setToDate('');
    setSortBy('createdAt');
    setSortDir('desc');
    setPage(1);
  };

  const toggleSortDir = () => {
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
  };

  const exportCSV = () => {
    const headers = ['Ride ID', 'Date', 'User', 'Driver', 'Pickup', 'Dropoff', 'Vehicle', 'Status', 'Distance (km)', 'Duration (min)', 'Fare (₹)', 'Payment Method', 'Payment Status', 'Surge', 'Cancelled By', 'Cancel Reason'];
    const rows = rides.map((r) => [
      r.id,
      r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '',
      r.userName,
      r.driverName,
      `"${(r.pickupAddress || '').replace(/"/g, '""')}"`,
      `"${(r.dropoffAddress || '').replace(/"/g, '""')}"`,
      r.rideType,
      r.status,
      r.distanceKm?.toFixed(1) ?? '',
      r.durationMinutes ?? '',
      r.actualFare ?? r.estimatedFare ?? '',
      r.paymentMethod || '',
      r.paymentStatus || '',
      r.surgeMultiplier,
      r.cancelledBy || '',
      `"${(r.cancellationReason || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ride-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Ride History</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#757575' }}>
            {total} total rides
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={resetFilters} style={btnStyle('#9E9E9E')}>Reset Filters</button>
          <button onClick={exportCSV} style={btnStyle('#1E88E5')}>Export CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 16, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by address or ride ID..."
            style={inputStyle}
          />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={selectStyle}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
          </select>
          <select value={paymentMethodFilter} onChange={(e) => { setPaymentMethodFilter(e.target.value); setPage(1); }} style={selectStyle}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m === 'ALL' ? 'All Payment' : m.replace('_', ' ')}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} style={dateInputStyle} />
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} style={dateInputStyle} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
            {SORT_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button onClick={toggleSortDir} style={btnStyle('#666')}>
            {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ fontSize: 14, color: '#757575' }}>Loading rides...</p>
      ) : rides.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 10 }}>
          <p style={{ fontSize: 16, color: '#757575' }}>No rides found</p>
          <button onClick={resetFilters} style={{ ...btnStyle('#1E88E5'), marginTop: 8 }}>Clear Filters</button>
        </div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={thStyle}>Ride ID</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Driver</th>
                <th style={thStyle}>Pickup</th>
                <th style={thStyle}>Dropoff</th>
                <th style={thStyle}>Vehicle</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Distance</th>
                <th style={thStyle}>Fare</th>
                <th style={thStyle}>Payment</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => (
                <tr key={ride.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                  <td style={tdStyle}>
                    <span style={{ color: '#1565C0', fontWeight: 600, cursor: 'pointer' }} onClick={() => setDetailRide(ride)}>
                      #{ride.id}
                    </span>
                  </td>
                  <td style={tdStyle}>{ride.createdAt ? new Date(ride.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td style={tdStyle}>{ride.userName}</td>
                  <td style={tdStyle}>{ride.driverName !== 'Unassigned' ? ride.driverName : <span style={{ color: '#9E9E9E' }}>—</span>}</td>
                  <td style={tdStyle} title={ride.pickupAddress}>{truncate(ride.pickupAddress, 20)}</td>
                  <td style={tdStyle} title={ride.dropoffAddress}>{truncate(ride.dropoffAddress, 20)}</td>
                  <td style={tdStyle}>{ride.rideType}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: `${STATUS_COLORS[ride.status] || '#9E9E9E'}22`, color: STATUS_COLORS[ride.status] || '#9E9E9E' }}>
                      {ride.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={tdStyle}>{ride.distanceKm ? `${ride.distanceKm.toFixed(1)} km` : '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>₹{(ride.actualFare ?? ride.estimatedFare ?? 0).toFixed(0)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {ride.paymentMethod && <span style={{ fontSize: 11, color: '#333' }}>{ride.paymentMethod}</span>}
                      {ride.paymentStatus && (
                        <span style={{ fontSize: 10, color: PAYMENT_COLORS[ride.paymentStatus] || '#757575', fontWeight: 600 }}>
                          {ride.paymentStatus}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => setDetailRide(ride)} style={{ padding: '4px 8px', background: '#1565C018', color: '#1565C0', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '8px 0' }}>
            <span style={{ fontSize: 12, color: '#757575' }}>
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ ...btnStyle('#666'), opacity: page <= 1 ? 0.4 : 1 }}>Prev</button>
              <span style={{ fontSize: 12, color: '#333', padding: '6px 12px' }}>Page {page} of {totalPages || 1}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ ...btnStyle('#666'), opacity: page >= totalPages ? 0.4 : 1 }}>Next</button>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {detailRide && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Ride #{detailRide.id}</h2>
              <button onClick={() => setDetailRide(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>User</label><p style={valueStyle}>{detailRide.userName}</p></div>
              <div><label style={labelStyle}>Driver</label><p style={valueStyle}>{detailRide.driverName}</p></div>
              <div><label style={labelStyle}>Vehicle</label><p style={valueStyle}>{detailRide.rideType}</p></div>
              <div><label style={labelStyle}>Status</label><p style={{ ...valueStyle, color: STATUS_COLORS[detailRide.status] || '#333' }}>{detailRide.status.replace(/_/g, ' ')}</p></div>
              <div><label style={labelStyle}>Date</label><p style={valueStyle}>{detailRide.createdAt ? new Date(detailRide.createdAt).toLocaleString('en-IN') : '—'}</p></div>
              <div><label style={labelStyle}>Distance</label><p style={valueStyle}>{detailRide.distanceKm ? `${detailRide.distanceKm.toFixed(1)} km` : '—'}</p></div>
              <div><label style={labelStyle}>Duration</label><p style={valueStyle}>{detailRide.durationMinutes ? `${detailRide.durationMinutes} min` : '—'}</p></div>
              <div><label style={labelStyle}>Surge</label><p style={valueStyle}>{detailRide.surgeMultiplier}x</p></div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Pickup</label>
              <p style={valueStyle}>{detailRide.pickupAddress}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Dropoff</label>
              <p style={valueStyle}>{detailRide.dropoffAddress}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#757575', margin: 0 }}>Estimated Fare</p>
                <p style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0' }}>₹{(detailRide.estimatedFare ?? 0).toFixed(0)}</p>
              </div>
              <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#757575', margin: 0 }}>Actual Fare</p>
                <p style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0', color: '#1E88E5' }}>₹{(detailRide.actualFare ?? detailRide.estimatedFare ?? 0).toFixed(0)}</p>
              </div>
              <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#757575', margin: 0 }}>Platform Commission</p>
                <p style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0', color: '#FF6D00' }}>₹{((detailRide.actualFare ?? detailRide.estimatedFare ?? 0) * 0.2).toFixed(0)}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>Payment Method</label><p style={valueStyle}>{detailRide.paymentMethod || '—'}</p></div>
              <div><label style={labelStyle}>Payment Status</label><p style={{ ...valueStyle, color: PAYMENT_COLORS[detailRide.paymentStatus] || '#333' }}>{detailRide.paymentStatus || '—'}</p></div>
            </div>

            {detailRide.status === 'CANCELLED' && (
              <div style={{ background: '#FFF3E0', borderRadius: 8, padding: 12, marginTop: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#E65100', margin: 0 }}>Cancellation Info</p>
                <p style={{ fontSize: 12, color: '#333', margin: '4px 0 0' }}>By: {detailRide.cancelledBy || 'Unknown'}</p>
                <p style={{ fontSize: 12, color: '#333', margin: '4px 0 0' }}>Reason: {detailRide.cancellationReason || 'No reason provided'}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setDetailRide(null)} style={{ padding: '8px 16px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function truncate(str: string, len: number) {
  return str && str.length > len ? str.substring(0, len) + '...' : str || '';
}

const thStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 11, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '8px 12px', fontSize: 12 };
const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, minWidth: 200 };
const selectStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 };
const dateInputStyle: React.CSSProperties = { padding: '7px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxHeight: '85vh', overflow: 'auto' };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5 };
const valueStyle: React.CSSProperties = { fontSize: 13, color: '#333', margin: '2px 0 0', fontWeight: 500 };
function btnStyle(color: string): React.CSSProperties {
  return { padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: `${color}18`, color };
}
