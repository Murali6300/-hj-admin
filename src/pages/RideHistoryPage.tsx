import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import '../styles/RidePages.css';

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
  platformCommission: number | null;
  driverEarnings: number | null;
  settlementStatus: string | null;
}

const STATUS_OPTIONS = ['ALL', 'COMPLETED', 'CANCELLED', 'REQUESTED', 'ACCEPTED', 'IN_PROGRESS'];
const PAYMENT_METHODS = ['ALL', 'CASH', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'CARD', 'WALLET'];
const SORT_FIELDS = [
  { value: 'createdAt', label: 'Date' },
  { value: 'actualFare', label: 'Fare' },
];

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'REQUESTED': return 'ride-badge--requested';
    case 'ACCEPTED': return 'ride-badge--accepted';
    case 'DRIVER_EN_ROUTE': return 'ride-badge--en-route';
    case 'DRIVER_ARRIVED': return 'ride-badge--arrived';
    case 'IN_PROGRESS': return 'ride-badge--in-progress';
    case 'COMPLETED': return 'ride-badge--completed';
    case 'CANCELLED': return 'ride-badge--cancelled';
    default: return 'ride-badge--no-drivers';
  }
}

function getPaymentColor(status: string): string {
  switch (status) {
    case 'SUCCESS': return 'var(--hj-success)';
    case 'PENDING': return 'var(--hj-warning)';
    case 'FAILED': return 'var(--hj-danger)';
    default: return 'var(--hj-text-tertiary)';
  }
}

function truncate(str: string, len: number) {
  return str && str.length > len ? str.substring(0, len) + '…' : str || '';
}

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
    const headers = ['Ride ID', 'Date', 'User', 'Driver', 'Pickup', 'Dropoff', 'Vehicle', 'Status', 'Distance (km)', 'Duration (min)', 'Fare (₹)', 'Commission (₹)', 'Driver Earnings (₹)', 'Settlement', 'Payment Method', 'Payment Status', 'Surge', 'Cancelled By', 'Cancel Reason'];
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
      r.platformCommission?.toFixed(0) ?? '',
      r.driverEarnings?.toFixed(0) ?? '',
      r.settlementStatus ?? '',
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
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="ride-page-header">
        <div className="ride-page-header__left">
          <h1>Ride History</h1>
          <p>{total.toLocaleString()} total rides</p>
        </div>
        <div className="ride-page-header__actions">
          <button className="ride-btn ride-btn--outline" onClick={resetFilters}>
            ↻ Reset Filters
          </button>
          <button className="ride-btn ride-btn--primary" onClick={exportCSV}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="ride-filters">
        <div className="ride-filters__row">
          <input
            className="ride-filters__input"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by address or ride ID…"
          />
          <select
            className="ride-filters__select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            className="ride-filters__select"
            value={paymentMethodFilter}
            onChange={(e) => { setPaymentMethodFilter(e.target.value); setPage(1); }}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m === 'ALL' ? 'All Payment' : m.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input
            className="ride-filters__date"
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          />
          <input
            className="ride-filters__date"
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          />
          <select
            className="ride-filters__select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <button className="ride-btn ride-btn--ghost" onClick={toggleSortDir}>
            {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      {loading ? (
        <div className="ride-loading">
          <div className="ride-loading__spinner" />
          <p className="ride-loading__text">Loading rides…</p>
        </div>
      ) : rides.length === 0 ? (
        <div className="ride-empty">
          <div className="ride-empty__icon">📜</div>
          <p className="ride-empty__title">No rides found</p>
          <p className="ride-empty__desc">Try adjusting your filters</p>
          <button className="ride-btn ride-btn--primary" onClick={resetFilters} style={{ marginTop: 12 }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="ride-table-card">
            <table className="ride-table">
              <thead>
                <tr>
                  <th>Ride ID</th>
                  <th>Date</th>
                  <th>User</th>
                  <th>Driver</th>
                  <th>Pickup</th>
                  <th>Dropoff</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Distance</th>
                  <th>Fare</th>
                  <th>Commission</th>
                  <th>Driver Earnings</th>
                  <th>Settlement</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => (
                  <tr key={ride.id}>
                    <td>
                      <span className="ride-info-row__value--link" onClick={() => setDetailRide(ride)}>
                        #{ride.id}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {ride.createdAt
                        ? new Date(ride.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>{ride.userName}</td>
                    <td>
                      {ride.driverName !== 'Unassigned' ? ride.driverName : <span style={{ color: 'var(--hj-text-tertiary)' }}>—</span>}
                    </td>
                    <td title={ride.pickupAddress}>{truncate(ride.pickupAddress, 20)}</td>
                    <td title={ride.dropoffAddress}>{truncate(ride.dropoffAddress, 20)}</td>
                    <td>{ride.rideType}</td>
                    <td>
                      <span className={`ride-badge ${getStatusBadgeClass(ride.status)}`}>
                        <span className="ride-badge__dot" />
                        {ride.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{ride.distanceKm ? `${ride.distanceKm.toFixed(1)} km` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>₹{(ride.actualFare ?? ride.estimatedFare ?? 0).toFixed(0)}</td>
                    <td style={{ color: '#FF9800', fontWeight: 600 }}>
                      {ride.platformCommission != null ? `₹${ride.platformCommission.toFixed(0)}` : '—'}
                    </td>
                    <td style={{ color: '#4CAF50', fontWeight: 600 }}>
                      {ride.driverEarnings != null ? `₹${ride.driverEarnings.toFixed(0)}` : '—'}
                    </td>
                    <td>
                      {ride.settlementStatus ? (
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          color: ride.settlementStatus === 'COMPLETED' ? '#fff' : ride.settlementStatus === 'FAILED' ? '#fff' : '#333',
                          background: ride.settlementStatus === 'COMPLETED' ? '#4CAF50' : ride.settlementStatus === 'FAILED' ? '#F44336' : '#FFC107',
                        }}>
                          {ride.settlementStatus}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {ride.paymentMethod && (
                          <span style={{ fontSize: 'var(--hj-text-xs)', color: 'var(--hj-text)' }}>{ride.paymentMethod}</span>
                        )}
                        {ride.paymentStatus && (
                          <span style={{ fontSize: '10px', color: getPaymentColor(ride.paymentStatus), fontWeight: 600 }}>
                            {ride.paymentStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button className="ride-action-btn ride-action-btn--primary" onClick={() => setDetailRide(ride)}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="ride-pagination">
            <span className="ride-pagination__info">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="ride-pagination__controls">
              <button className="ride-pagination__btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                ← Prev
              </button>
              <span className="ride-pagination__page">Page {page} of {totalPages || 1}</span>
              <button className="ride-pagination__btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Detail Modal ─────────────────────────────────── */}
      {detailRide && (
        <div className="ride-modal-overlay">
          <div className="ride-modal ride-modal--md">
            <div className="ride-modal__header">
              <h2 className="ride-modal__title">Ride #{detailRide.id}</h2>
              <button className="ride-modal__close" onClick={() => setDetailRide(null)}>×</button>
            </div>

            <div className="ride-detail-modal__grid">
              <div className="ride-detail-modal__item">
                <span className="ride-detail-modal__item-label">User</span>
                <span className="ride-detail-modal__item-value">{detailRide.userName}</span>
              </div>
              <div className="ride-detail-modal__item">
                <span className="ride-detail-modal__item-label">Driver</span>
                <span className="ride-detail-modal__item-value">{detailRide.driverName}</span>
              </div>
              <div className="ride-detail-modal__item">
                <span className="ride-detail-modal__item-label">Vehicle</span>
                <span className="ride-detail-modal__item-value">{detailRide.rideType}</span>
              </div>
              <div className="ride-detail-modal__item">
                <span className="ride-detail-modal__item-label">Status</span>
                <span className={`ride-badge ${getStatusBadgeClass(detailRide.status)}`}>
                  <span className="ride-badge__dot" />
                  {detailRide.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="ride-detail-modal__item">
                <span className="ride-detail-modal__item-label">Date</span>
                <span className="ride-detail-modal__item-value">
                  {detailRide.createdAt ? new Date(detailRide.createdAt).toLocaleString('en-IN') : '—'}
                </span>
              </div>
              <div className="ride-detail-modal__item">
                <span className="ride-detail-modal__item-label">Distance</span>
                <span className="ride-detail-modal__item-value">
                  {detailRide.distanceKm ? `${detailRide.distanceKm.toFixed(1)} km` : '—'}
                </span>
              </div>
              <div className="ride-detail-modal__item">
                <span className="ride-detail-modal__item-label">Duration</span>
                <span className="ride-detail-modal__item-value">
                  {detailRide.durationMinutes ? `${detailRide.durationMinutes} min` : '—'}
                </span>
              </div>
              <div className="ride-detail-modal__item">
                <span className="ride-detail-modal__item-label">Surge</span>
                <span className="ride-detail-modal__item-value">{detailRide.surgeMultiplier}x</span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span className="ride-detail-modal__item-label">Pickup</span>
              <p className="ride-detail-modal__item-value" style={{ marginTop: 4 }}>{detailRide.pickupAddress}</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <span className="ride-detail-modal__item-label">Dropoff</span>
              <p className="ride-detail-modal__item-value" style={{ marginTop: 4 }}>{detailRide.dropoffAddress}</p>
            </div>

            {/* Fare Cards */}
            <div className="ride-fare-cards">
              <div className="ride-fare-card">
                <p className="ride-fare-card__label">Estimated Fare</p>
                <p className="ride-fare-card__value">₹{(detailRide.estimatedFare ?? 0).toFixed(0)}</p>
              </div>
              <div className="ride-fare-card">
                <p className="ride-fare-card__label">Actual Fare</p>
                <p className="ride-fare-card__value ride-fare-card__value--primary">
                  ₹{(detailRide.actualFare ?? detailRide.estimatedFare ?? 0).toFixed(0)}
                </p>
              </div>
              <div className="ride-fare-card">
                <p className="ride-fare-card__label">Commission (20%)</p>
                <p className="ride-fare-card__value ride-fare-card__value--orange">
                  ₹{(detailRide.platformCommission ?? ((detailRide.actualFare ?? detailRide.estimatedFare ?? 0) * 0.2)).toFixed(0)}
                </p>
              </div>
              <div className="ride-fare-card">
                <p className="ride-fare-card__label">Driver Earnings</p>
                <p className="ride-fare-card__value ride-fare-card__value--primary">
                  ₹{(detailRide.driverEarnings ?? ((detailRide.actualFare ?? detailRide.estimatedFare ?? 0) * 0.8)).toFixed(0)}
                </p>
              </div>
              {detailRide.settlementStatus && (
                <div className="ride-fare-card">
                  <p className="ride-fare-card__label">Settlement</p>
                  <p className="ride-fare-card__value" style={{
                    color: detailRide.settlementStatus === 'COMPLETED' ? '#4CAF50' : detailRide.settlementStatus === 'FAILED' ? '#F44336' : '#FFC107',
                  }}>
                    {detailRide.settlementStatus}
                  </p>
                </div>
              )}
            </div>

            <div className="ride-detail-modal__grid">
              <div className="ride-detail-modal__item">
                <span className="ride-detail-modal__item-label">Payment Method</span>
                <span className="ride-detail-modal__item-value">{detailRide.paymentMethod || '—'}</span>
              </div>
              <div className="ride-detail-modal__item">
                <span className="ride-detail-modal__item-label">Payment Status</span>
                <span className="ride-detail-modal__item-value" style={{ color: getPaymentColor(detailRide.paymentStatus) }}>
                  {detailRide.paymentStatus || '—'}
                </span>
              </div>
            </div>

            {detailRide.status === 'CANCELLED' && (
              <div className="ride-cancel-info" style={{ marginTop: 16 }}>
                <p className="ride-cancel-info__title">Cancellation Info</p>
                <p className="ride-cancel-info__text">By: {detailRide.cancelledBy || 'Unknown'}</p>
                <p className="ride-cancel-info__text">Reason: {detailRide.cancellationReason || 'No reason provided'}</p>
              </div>
            )}

            <div className="ride-modal__footer">
              <button className="ride-btn ride-btn--primary" onClick={() => setDetailRide(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
