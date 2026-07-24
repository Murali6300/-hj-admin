import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/RidePages.css';

interface RideDetail {
  id: number;
  userId: number;
  userName: string;
  userPhone: string | null;
  driverId: number | null;
  driverName: string;
  driverPhone: string | null;
  driverVehicleType: string | null;
  driverVehicleMake: string | null;
  driverVehiclePlate: string | null;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  rideType: string;
  status: string;
  estimatedFare: number | null;
  actualFare: number | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  surgeMultiplier: number;
  paymentStatus: string | null;
  paymentMethod: string | null;
  transactionId: string | null;
  cancellationReason: string | null;
  cancelledBy: string | null;
  createdAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  platformCommission: number | null;
  driverEarnings: number | null;
  settlementStatus: string | null;
}

interface TimelineStep {
  label: string;
  time: string | null;
  completed: boolean;
  current: boolean;
}

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

function getTimeline(ride: RideDetail): TimelineStep[] {
  const statusOrder = ['REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
  const currentIdx = statusOrder.indexOf(ride.status);

  if (ride.status === 'CANCELLED') {
    return [
      { label: 'Booked', time: ride.createdAt, completed: true, current: false },
      { label: 'Cancelled', time: ride.cancelledAt, completed: true, current: true },
    ];
  }

  return [
    { label: 'Booked', time: ride.createdAt, completed: true, current: currentIdx === 0 },
    { label: 'Driver Assigned', time: ride.acceptedAt, completed: currentIdx >= 1, current: currentIdx === 1 },
    { label: 'Driver Arrived', time: currentIdx >= 3 ? ride.startedAt : null, completed: currentIdx >= 3, current: currentIdx === 3 },
    { label: 'OTP Verified', time: currentIdx >= 4 ? ride.startedAt : null, completed: currentIdx >= 4, current: currentIdx === 4 },
    { label: 'Ride Started', time: ride.startedAt, completed: currentIdx >= 4, current: currentIdx === 4 },
    { label: 'Ride Completed', time: ride.completedAt, completed: currentIdx >= 5, current: currentIdx === 5 },
  ];
}

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  const fetchRide = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/rides/${id}`);
      setRide(res.data);
    } catch {
      setError('Failed to load ride details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRide();
  }, [fetchRide]);

  // Load Leaflet dynamically and render map
  useEffect(() => {
    if (!ride || !mapRef.current) return;
    if (ride.pickupLatitude === 0 && ride.pickupLongitude === 0) return;

    const loadMap = async () => {
      if (!(window as unknown as Record<string, unknown>).L) {
        await new Promise<void>((resolve) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);

          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      const L = (window as unknown as Record<string, unknown>).L as Record<string, unknown>;
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = (L as { map: (el: HTMLElement, opts: unknown) => unknown }).map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      });
      mapInstanceRef.current = map;

      const tileLayer = (L as { tileLayer: (url: string, opts: unknown) => { addTo: (m: unknown) => unknown } }).tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap contributors' },
      );
      tileLayer.addTo(map);

      const pickupLatLng = [ride.pickupLatitude, ride.pickupLongitude];
      const destLatLng = [ride.dropoffLatitude, ride.dropoffLongitude];

      const markerIcon = (L as { divIcon: (opts: unknown) => unknown }).divIcon({
        html: '<div style="background:#22C55E;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>',
        iconSize: [14, 14],
        className: '',
      });

      const destIcon = (L as { divIcon: (opts: unknown) => unknown }).divIcon({
        html: '<div style="background:#EF4444;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>',
        iconSize: [14, 14],
        className: '',
      });

      (L as { marker: (latlng: number[], opts: unknown) => { addTo: (m: unknown) => unknown } }).marker(pickupLatLng, { icon: markerIcon }).addTo(map);
      (L as { marker: (latlng: number[], opts: unknown) => { addTo: (m: unknown) => unknown } }).marker(destLatLng, { icon: destIcon }).addTo(map);

      const polyline = (L as { polyline: (coords: number[][], opts: unknown) => { addTo: (m: unknown) => unknown } }).polyline(
        [pickupLatLng, destLatLng],
        { color: '#1E88E5', weight: 4, opacity: 0.8, dashArray: '10, 8' },
      );
      polyline.addTo(map);

      const bounds = (L as { latLngBounds: (coords: number[][]) => unknown }).latLngBounds([pickupLatLng, destLatLng]);
      (map as { fitBounds: (b: unknown, opts: unknown) => unknown }).fitBounds(bounds, { padding: [50, 50] });
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [ride]);

  const handleCancelRide = async () => {
    if (!id) return;
    if (!confirm('Cancel this ride? The rider will be notified.')) return;
    try {
      await api.post(`/rides/${id}/cancel`, { reason: cancelReason || 'Cancelled by admin' });
      setCancelModal(false);
      fetchRide();
    } catch {
      alert('Failed to cancel ride');
    }
  };

  const handleReassign = async () => {
    if (!id || !confirm('Reassign this ride to a different driver?')) return;
    try {
      await api.post(`/rides/${id}/reassign`);
      fetchRide();
    } catch {
      alert('Failed to reassign ride');
    }
  };

  if (loading) {
    return (
      <div className="ride-loading">
        <div className="ride-loading__spinner" />
        <p className="ride-loading__text">Loading ride details…</p>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="ride-empty">
        <div className="ride-empty__icon">⚠️</div>
        <p className="ride-empty__title">{error || 'Ride not found'}</p>
        <button className="ride-btn ride-btn--primary" onClick={() => navigate('/rides')} style={{ marginTop: 12 }}>
          ← Back to Rides
        </button>
      </div>
    );
  }

  const timeline = getTimeline(ride);
  const isActive = !['COMPLETED', 'CANCELLED'].includes(ride.status);

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="ride-page-header">
        <div className="ride-page-header__left" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="ride-btn ride-btn--outline" onClick={() => navigate('/rides')}>
            ← Back
          </button>
          <div>
            <h1>Ride #{ride.id}</h1>
            <p>Created {new Date(ride.createdAt).toLocaleString('en-IN')}</p>
          </div>
          <span className={`ride-badge ${getStatusBadgeClass(ride.status)}`}>
            <span className="ride-badge__dot" />
            {ride.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="ride-page-header__actions">
          {isActive && (
            <button className="ride-btn ride-btn--outline" onClick={fetchRide}>
              ↻ Refresh
            </button>
          )}
        </div>
      </div>

      {/* ── Two Column Grid ──────────────────────────────── */}
      <div className="ride-detail-grid">
        {/* Left Column */}
        <div className="ride-detail-col">
          {/* Map Card */}
          <div className="ride-map-card">
            <div className="ride-map-card__header">
              <span className="ride-map-card__title">Route Map</span>
              {ride.distanceKm && (
                <span style={{ fontSize: 'var(--hj-text-sm)', color: 'var(--hj-text-secondary)' }}>
                  {ride.distanceKm.toFixed(1)} km
                </span>
              )}
            </div>
            <div ref={mapRef} className="ride-map-card__map" />
            <div className="ride-map-card__legend">
              <span className="ride-map-card__legend-item">
                <span className="ride-map-card__legend-dot" style={{ background: 'var(--hj-success)' }} />
                Pickup
              </span>
              <span className="ride-map-card__legend-item">
                <span className="ride-map-card__legend-dot" style={{ background: 'var(--hj-danger)' }} />
                Destination
              </span>
            </div>
          </div>

          {/* Timeline Card */}
          <div className="ride-timeline-card">
            <h3 className="ride-timeline-card__title">Ride Timeline</h3>
            <div className="ride-timeline">
              {timeline.map((step, i) => (
                <div className="ride-timeline__step" key={step.label}>
                  <div className="ride-timeline__track">
                    <div className={`ride-timeline__dot ${
                      step.current ? 'ride-timeline__dot--current' :
                      step.completed ? 'ride-timeline__dot--completed' :
                      'ride-timeline__dot--pending'
                    }`} />
                    {i < timeline.length - 1 && (
                      <div className={`ride-timeline__line ${step.completed ? 'ride-timeline__line--completed' : 'ride-timeline__line--pending'}`} />
                    )}
                  </div>
                  <div className="ride-timeline__content">
                    <p className={`ride-timeline__label ${
                      step.current ? 'ride-timeline__label--current' :
                      !step.completed ? 'ride-timeline__label--pending' : ''
                    }`}>
                      {step.label}
                    </p>
                    {step.time && (
                      <p className="ride-timeline__time">
                        {new Date(step.time).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Addresses */}
          <div className="ride-address-card">
            <div className="ride-address-card__grid">
              <div>
                <p className="ride-address-card__item-label">Pickup</p>
                <p className="ride-address-card__item-value">{ride.pickupAddress}</p>
                <p className="ride-address-card__item-coords">
                  {ride.pickupLatitude.toFixed(5)}, {ride.pickupLongitude.toFixed(5)}
                </p>
              </div>
              <div>
                <p className="ride-address-card__item-label">Destination</p>
                <p className="ride-address-card__item-value">{ride.dropoffAddress}</p>
                <p className="ride-address-card__item-coords">
                  {ride.dropoffLatitude.toFixed(5)}, {ride.dropoffLongitude.toFixed(5)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="ride-detail-col">
          {/* Passenger Card */}
          <div className="ride-info-card">
            <h3 className="ride-info-card__title">👤 Passenger</h3>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Name</span>
              <span className="ride-info-row__value">{ride.userName}</span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Phone</span>
              {ride.userPhone ? (
                <a href={`tel:${ride.userPhone}`} className="ride-info-row__value ride-info-row__value--link">
                  {ride.userPhone}
                </a>
              ) : (
                <span className="ride-info-row__value">N/A</span>
              )}
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">User ID</span>
              <span className="ride-info-row__value">#{ride.userId}</span>
            </div>
          </div>

          {/* Driver Card */}
          <div className="ride-info-card">
            <h3 className="ride-info-card__title">🚗 Driver</h3>
            {ride.driverName !== 'Unassigned' ? (
              <>
                <div className="ride-info-row">
                  <span className="ride-info-row__label">Name</span>
                  <span className="ride-info-row__value">{ride.driverName}</span>
                </div>
                <div className="ride-info-row">
                  <span className="ride-info-row__label">Phone</span>
                  {ride.driverPhone ? (
                    <a href={`tel:${ride.driverPhone}`} className="ride-info-row__value ride-info-row__value--link">
                      {ride.driverPhone}
                    </a>
                  ) : (
                    <span className="ride-info-row__value">N/A</span>
                  )}
                </div>
                <div className="ride-info-row">
                  <span className="ride-info-row__label">Vehicle</span>
                  <span className="ride-info-row__value">
                    {ride.driverVehicleType || ''} {ride.driverVehicleMake || ''}
                  </span>
                </div>
                <div className="ride-info-row">
                  <span className="ride-info-row__label">Plate</span>
                  <span className="ride-info-row__value">{ride.driverVehiclePlate || 'N/A'}</span>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 'var(--hj-text-base)', color: 'var(--hj-text-tertiary)' }}>
                No driver assigned yet
              </p>
            )}
          </div>

          {/* Fare & Payment Card */}
          <div className="ride-info-card">
            <h3 className="ride-info-card__title">💳 Fare & Payment</h3>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Estimated Fare</span>
              <span className="ride-info-row__value">
                {ride.estimatedFare ? `₹${ride.estimatedFare.toFixed(0)}` : 'N/A'}
              </span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Actual Fare</span>
              <span className="ride-info-row__value ride-info-row__value--bold">
                {ride.actualFare ? `₹${ride.actualFare.toFixed(0)}` : 'Pending'}
              </span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Distance</span>
              <span className="ride-info-row__value">
                {ride.distanceKm ? `${ride.distanceKm.toFixed(1)} km` : 'N/A'}
              </span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Duration</span>
              <span className="ride-info-row__value">
                {ride.durationMinutes ? `${ride.durationMinutes} min` : 'N/A'}
              </span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Surge</span>
              <span className="ride-info-row__value">{ride.surgeMultiplier}x</span>
            </div>
            <div style={{ height: 1, background: 'var(--hj-border-light)', margin: '10px 0' }} />
            <div className="ride-info-row">
              <span className="ride-info-row__label">Payment Status</span>
              <span className="ride-info-row__value">{ride.paymentStatus || 'N/A'}</span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Method</span>
              <span className="ride-info-row__value">{ride.paymentMethod || 'N/A'}</span>
            </div>
            {ride.transactionId && (
              <div className="ride-info-row">
                <span className="ride-info-row__label">Transaction</span>
                <span className="ride-info-row__value" style={{ fontFamily: 'var(--hj-font-mono)', fontSize: 'var(--hj-text-xs)' }}>
                  {ride.transactionId}
                </span>
              </div>
            )}
          </div>

          {/* Cash Payment Details Card */}
          {ride.status === 'COMPLETED' && ride.paymentMethod && (
            <div className="ride-info-card">
              <h3 className="ride-info-card__title">💰 Payment Breakdown</h3>
              <div className="ride-info-row">
                <span className="ride-info-row__label">Ride Status</span>
                <span className="ride-info-row__value" style={{ color: 'var(--hj-success)', fontWeight: 600 }}>
                  Completed
                </span>
              </div>
              <div className="ride-info-row">
                <span className="ride-info-row__label">Payment</span>
                <span className="ride-info-row__value">{ride.paymentMethod}</span>
              </div>
              <div className="ride-info-row">
                <span className="ride-info-row__label">Amount</span>
                <span className="ride-info-row__value ride-info-row__value--bold">
                  ₹{(ride.actualFare ?? ride.estimatedFare ?? 0).toFixed(0)}
                </span>
              </div>
              <div className="ride-info-row">
                <span className="ride-info-row__label">Commission</span>
                <span className="ride-info-row__value" style={{ color: 'var(--hj-warning)' }}>
                  ₹{(ride.platformCommission ?? 0).toFixed(0)}
                </span>
              </div>
              <div className="ride-info-row">
                <span className="ride-info-row__label">Driver Earnings</span>
                <span className="ride-info-row__value" style={{ color: 'var(--hj-success)' }}>
                  ₹{(ride.driverEarnings ?? 0).toFixed(0)}
                </span>
              </div>
              <div className="ride-info-row">
                <span className="ride-info-row__label">Settlement</span>
                <span className="ride-info-row__value">
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: ride.settlementStatus === 'COMPLETED' ? '#fff' : ride.settlementStatus === 'FAILED' ? '#fff' : '#333',
                    background: ride.settlementStatus === 'COMPLETED' ? 'var(--hj-success)' : ride.settlementStatus === 'FAILED' ? 'var(--hj-danger)' : 'var(--hj-warning)',
                  }}>
                    {ride.settlementStatus || 'PENDING'}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Cancellation Info */}
          {ride.status === 'CANCELLED' && (
            <div className="ride-info-card">
              <h3 className="ride-info-card__title">❌ Cancellation</h3>
              <div className="ride-cancel-info">
                <p className="ride-cancel-info__title">Cancellation Details</p>
                <p className="ride-cancel-info__text">Reason: {ride.cancellationReason || 'N/A'}</p>
                <p className="ride-cancel-info__text">Cancelled By: {ride.cancelledBy || 'N/A'}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          {isActive && (
            <div className="ride-actions-card">
              <h3 className="ride-actions-card__title">⚡ Actions</h3>
              <div className="ride-actions-card__list">
                {ride.driverPhone && (
                  <button
                    className="ride-actions-card__btn ride-actions-card__btn--purple"
                    onClick={() => window.open(`tel:${ride.driverPhone}`, '_self')}
                  >
                    📞 Contact Driver
                  </button>
                )}
                {ride.userPhone && (
                  <button
                    className="ride-actions-card__btn ride-actions-card__btn--green"
                    onClick={() => window.open(`tel:${ride.userPhone}`, '_self')}
                  >
                    📞 Contact User
                  </button>
                )}
                {(ride.status === 'ACCEPTED' || ride.status === 'DRIVER_EN_ROUTE') && (
                  <button
                    className="ride-actions-card__btn ride-actions-card__btn--orange"
                    onClick={handleReassign}
                  >
                    🔄 Reassign Driver
                  </button>
                )}
                {!['COMPLETED', 'CANCELLED'].includes(ride.status) && (
                  <button
                    className="ride-actions-card__btn ride-actions-card__btn--red"
                    onClick={() => setCancelModal(true)}
                  >
                    ✕ Cancel Ride
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Cancel Modal ─────────────────────────────────── */}
      {cancelModal && (
        <div className="ride-modal-overlay">
          <div className="ride-modal ride-modal--sm">
            <div className="ride-modal__header">
              <h2 className="ride-modal__title">Cancel Ride #{ride.id}</h2>
              <button className="ride-modal__close" onClick={() => setCancelModal(false)}>×</button>
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
              <button className="ride-btn ride-btn--outline" onClick={() => setCancelModal(false)}>
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
