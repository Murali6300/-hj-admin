import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

const REFRESH_INTERVAL = 15000;

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

function getEta(ride: Ride): string {
  switch (ride.status) {
    case 'REQUESTED': return 'Awaiting driver';
    case 'ACCEPTED': {
      if (!ride.createdAt) return 'Assigned';
      const mins = Math.round((Date.now() - new Date(ride.createdAt).getTime()) / 60000);
      return `Assigned ${mins}m ago`;
    }
    case 'DRIVER_EN_ROUTE': return 'Driver en route';
    case 'DRIVER_ARRIVED': return 'At pickup';
    case 'IN_PROGRESS': {
      if (ride.durationMinutes) return `~${ride.durationMinutes} min left`;
      return 'In progress';
    }
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    default: return '—';
  }
}

function truncate(str: string, len: number) {
  return str && str.length > len ? str.substring(0, len) + '…' : str || '';
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
    if (!confirm('Cancel this ride? The rider will be notified.')) return;
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
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="ride-page-header">
        <div className="ride-page-header__left">
          <h1>Live Rides</h1>
          <p>Real-time monitoring • Last updated: {lastUpdated.toLocaleTimeString('en-IN')}</p>
        </div>
        <div className="ride-page-header__actions">
          <div className={`ride-live-indicator ${autoRefresh ? 'ride-live-indicator--active' : 'ride-live-indicator--paused'}`}>
            <span className="ride-live-indicator__dot" />
            {autoRefresh ? 'Auto-refreshing' : 'Paused'}
          </div>
          <button
            className={`ride-btn ${autoRefresh ? 'ride-btn--outline' : 'ride-btn--primary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '⏸ Pause' : '▶ Resume'}
          </button>
          <button className="ride-btn ride-btn--outline" onClick={fetchLiveData}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────── */}
      <div className="ride-stats">
        <div className="ride-stat-card ride-stat-card--blue">
          <div className="ride-stat-card__icon ride-stat-card__icon--blue">🗺️</div>
          <p className="ride-stat-card__label">Active Rides</p>
          <p className="ride-stat-card__value">{stats?.activeRides ?? activeRides.length}</p>
        </div>
        <div className="ride-stat-card ride-stat-card--purple">
          <div className="ride-stat-card__icon ride-stat-card__icon--purple">🚗</div>
          <p className="ride-stat-card__label">In Progress</p>
          <p className="ride-stat-card__value">{inProgressCount}</p>
        </div>
        <div className="ride-stat-card ride-stat-card--orange">
          <div className="ride-stat-card__icon ride-stat-card__icon--orange">⏳</div>
          <p className="ride-stat-card__label">Awaiting Driver</p>
          <p className="ride-stat-card__value">{requestedCount}</p>
        </div>
        <div className="ride-stat-card ride-stat-card--green">
          <div className="ride-stat-card__icon ride-stat-card__icon--green">✓</div>
          <p className="ride-stat-card__label">Completed Today</p>
          <p className="ride-stat-card__value">{stats?.completedToday ?? 0}</p>
        </div>
      </div>

      {/* ── Live Rides Table ──────────────────────────────── */}
      {loading ? (
        <div className="ride-loading">
          <div className="ride-loading__spinner" />
          <p className="ride-loading__text">Loading live rides…</p>
        </div>
      ) : activeRides.length === 0 ? (
        <div className="ride-empty">
          <div className="ride-empty__icon">🗺️</div>
          <p className="ride-empty__title">No active rides right now</p>
          <p className="ride-empty__desc">Rides will appear here when users book</p>
        </div>
      ) : (
        <div className="ride-table-card">
          <table className="ride-table">
            <thead>
              <tr>
                <th>Ride ID</th>
                <th>User</th>
                <th>Driver</th>
                <th>Pickup</th>
                <th>Destination</th>
                <th>Status</th>
                <th>ETA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeRides.map((ride) => (
                <tr key={ride.id}>
                  <td>
                    <span
                      className="ride-info-row__value--link"
                      onClick={() => navigate(`/rides/${ride.id}`)}
                    >
                      #{ride.id}
                    </span>
                  </td>
                  <td>{ride.userName}</td>
                  <td>
                    {ride.driverName !== 'Unassigned' ? (
                      ride.driverName
                    ) : (
                      <span style={{ color: 'var(--hj-text-tertiary)' }}>Unassigned</span>
                    )}
                  </td>
                  <td title={ride.pickupAddress}>{truncate(ride.pickupAddress, 25)}</td>
                  <td title={ride.dropoffAddress}>{truncate(ride.dropoffAddress, 25)}</td>
                  <td>
                    <span className={`ride-badge ${getStatusBadgeClass(ride.status)}`}>
                      <span className="ride-badge__dot" />
                      {ride.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--hj-text-secondary)', fontSize: 'var(--hj-text-xs)' }}>
                    {getEta(ride)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="ride-action-btn ride-action-btn--primary" onClick={() => navigate(`/rides/${ride.id}`)}>
                        Track
                      </button>
                      {ride.driverName !== 'Unassigned' && (
                        <button className="ride-action-btn ride-action-btn--purple" onClick={() => window.open(`tel:${ride.driverId}`, '_self')}>
                          📞 Driver
                        </button>
                      )}
                      {(ride.status === 'ACCEPTED' || ride.status === 'DRIVER_EN_ROUTE') && (
                        <button className="ride-action-btn ride-action-btn--warning" onClick={() => handleReassign(ride.id)}>
                          Reassign
                        </button>
                      )}
                      {!['COMPLETED', 'CANCELLED'].includes(ride.status) && (
                        <button className="ride-action-btn ride-action-btn--danger" onClick={() => setCancelModalRide(ride)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Cancel Modal ─────────────────────────────────── */}
      {cancelModalRide && (
        <div className="ride-modal-overlay">
          <div className="ride-modal ride-modal--sm">
            <div className="ride-modal__header">
              <h2 className="ride-modal__title">Cancel Ride #{cancelModalRide.id}</h2>
              <button className="ride-modal__close" onClick={() => setCancelModalRide(null)}>×</button>
            </div>
            <p className="ride-modal__desc">
              This will force-cancel the ride. The driver and user will be notified immediately.
            </p>
            <label className="ride-modal__label">Cancellation Reason</label>
            <input
              className="ride-modal__input"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Safety concern, driver unresponsive…"
            />
            <div className="ride-modal__footer">
              <button className="ride-btn ride-btn--outline" onClick={() => setCancelModalRide(null)}>
                Go Back
              </button>
              <button className="ride-btn ride-btn--danger" onClick={handleCancelRide}>
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
