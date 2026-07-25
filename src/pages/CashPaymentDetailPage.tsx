import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/RidePages.css';

interface PreviousDispute {
  paymentId: number;
  rideId: number;
  category: string;
  ticketNumber: string;
  resolution: string | null;
  disputedAt: string | null;
  resolvedAt: string | null;
  amount: number;
}

interface CashPaymentDetail {
  paymentId: number;
  totalFare: number;
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  tollCharges: number;
  waitingCharges: number;
  nightCharges: number;
  taxes: number;
  promoDiscount: number;
  offerDiscount: number;
  surgeMultiplier: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string | null;
  gstAmount: number | null;
  platformCommission: number | null;
  driverEarnings: number | null;
  settlementStatus: string | null;
  createdAt: string;
  updatedAt: string;
  userConfirmed: boolean;
  driverConfirmed: boolean;
  reminderCount: number;
  lastReminderAt: string | null;
  disputeReason: string | null;
  disputeCategory: string | null;
  disputeComment: string | null;
  disputeImageUrl: string | null;
  disputeTicketNumber: string | null;
  disputedAt: string | null;
  disputeResolution: string | null;
  disputeResolvedAt: string | null;
  disputeFiledByUserId: number | null;
  disputeFiledByUserName: string | null;
  rideId: number;
  rideStatus: string | null;
  pickupAddress: string | null;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string | null;
  dropoffLatitude: number;
  dropoffLongitude: number;
  rideType: string | null;
  estimatedFare: number | null;
  actualFare: number | null;
  rideDistanceKm: number | null;
  rideDurationMinutes: number | null;
  rideSurgeMultiplier: number;
  rideOtp: string | null;
  rideCreatedAt: string | null;
  rideAcceptedAt: string | null;
  rideStartedAt: string | null;
  rideCompletedAt: string | null;
  rideCancelledAt: string | null;
  driverId: number | null;
  driverName: string | null;
  driverPhone: string | null;
  driverEmail: string | null;
  driverVehicleType: string | null;
  driverVehicleNumber: string | null;
  driverProfilePhotoUrl: string | null;
  userId: number | null;
  userName: string | null;
  userPhone: string | null;
  userEmail: string | null;
  userFlagReason: string | null;
  userFlagged: boolean;
  userOutstandingBalance: number;
  userOutstandingReason: string | null;
  refundId: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  previousDisputes: PreviousDispute[];
  availableActions: string[];
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: '#4CAF50',
  PENDING: '#FFC107',
  FAILED: '#F44336',
  DISPUTED: '#E91E63',
  PENDING_USER_CONFIRMATION: '#FF9800',
  REFUNDED: '#FF6D00',
  PAYMENT_PENDING: '#7C3AED',
  CANCELLED: '#9E9E9E',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Waiting for Driver Confirmation',
  PENDING_USER_CONFIRMATION: 'Waiting for User Confirmation',
  SUCCESS: 'Resolved',
  DISPUTED: 'Disputed',
  PAYMENT_PENDING: 'Ride Payment Pending',
};

function getTimeline(detail: CashPaymentDetail) {
  const steps = [
    { label: 'Ride Booked', time: detail.rideCreatedAt, completed: true, current: false },
    { label: 'Driver Assigned', time: detail.rideAcceptedAt, completed: !!detail.rideAcceptedAt, current: !detail.rideStartedAt && !!detail.rideAcceptedAt },
    { label: 'Ride Started', time: detail.rideStartedAt, completed: !!detail.rideStartedAt, current: !detail.rideCompletedAt && !!detail.rideStartedAt },
    { label: 'Ride Completed', time: detail.rideCompletedAt, completed: !!detail.rideCompletedAt, current: false },
    { label: 'Driver Confirmed Cash', time: detail.driverConfirmed ? detail.updatedAt : null, completed: detail.driverConfirmed, current: !detail.driverConfirmed && detail.userConfirmed },
    { label: 'User Confirmed Cash', time: detail.userConfirmed ? detail.updatedAt : null, completed: detail.userConfirmed, current: !detail.userConfirmed && detail.driverConfirmed },
    { label: 'Payment Settled', time: detail.settlementStatus === 'COMPLETED' ? detail.updatedAt : null, completed: detail.settlementStatus === 'COMPLETED', current: false },
  ];
  if (detail.rideStatus === 'CANCELLED') {
    return [
      steps[0],
      { label: 'Ride Cancelled', time: detail.rideCancelledAt, completed: true, current: true },
    ];
  }
  return steps;
}

export default function CashPaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CashPaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  const fetchDetail = useCallback(async () => {
    if (!paymentId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/payments/cash/${paymentId}`);
      setDetail(res.data);
    } catch {
      setError('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Leaflet map
  useEffect(() => {
    if (!detail || !mapRef.current) return;
    if (detail.pickupLatitude === 0 && detail.pickupLongitude === 0) return;

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

      const pickupLatLng = [detail.pickupLatitude, detail.pickupLongitude];
      const destLatLng = [detail.dropoffLatitude, detail.dropoffLongitude];

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
  }, [detail]);

  const handleAction = async (action: string) => {
    if (!paymentId) return;
    setActionLoading(true);
    try {
      switch (action) {
        case 'APPROVE_DRIVER_CLAIM':
          await api.post(`/payments/${paymentId}/approve-claim`, { claimant: 'DRIVER' });
          break;
        case 'APPROVE_PASSENGER_CLAIM':
          await api.post(`/payments/${paymentId}/approve-claim`, { claimant: 'PASSENGER' });
          break;
        case 'REQUEST_MORE_INFO':
          await api.post(`/payments/${paymentId}/request-info`, { notes: actionNotes });
          break;
        case 'REFUND':
          await api.post(`/payments/${paymentId}/resolve-dispute`, {
            resolution: actionNotes || 'Refund approved',
            refund: true,
          });
          break;
        case 'MANUAL_SETTLEMENT':
          await api.post(`/payments/${paymentId}/manual-settlement`, {
            resolution: actionNotes || 'Manual settlement',
            refundToUser: false,
          });
          break;
        case 'CLOSE_CASE':
          await api.post(`/payments/${paymentId}/close-case`, {
            resolution: actionNotes || 'Case closed by admin',
          });
          break;
        default:
          break;
      }
      setActionModal(null);
      setActionNotes('');
      fetchDetail();
    } catch {
      alert('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ride-loading">
        <div className="ride-loading__spinner" />
        <p className="ride-loading__text">Loading payment details…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="ride-empty">
        <div className="ride-empty__icon">⚠️</div>
        <p className="ride-empty__title">{error || 'Payment not found'}</p>
        <button className="ride-btn ride-btn--primary" onClick={() => navigate('/cash-payments')} style={{ marginTop: 12 }}>
          ← Back to Cash Payments
        </button>
      </div>
    );
  }

  const timeline = getTimeline(detail);

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="ride-page-header">
        <div className="ride-page-header__left" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="ride-btn ride-btn--outline" onClick={() => navigate('/cash-payments')}>
            ← Back
          </button>
          <div>
            <h1>Cash Payment #{detail.paymentId}</h1>
            <p>Ride HJ{detail.rideId} · {new Date(detail.createdAt).toLocaleString('en-IN')}</p>
          </div>
          <span
            className="ride-badge"
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              background: STATUS_COLORS[detail.paymentStatus] || '#9E9E9E',
            }}
          >
            {STATUS_LABELS[detail.paymentStatus] || detail.paymentStatus}
          </span>
          {detail.disputeTicketNumber && (
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#E91E63', background: '#FCE4EC' }}>
              🎫 {detail.disputeTicketNumber}
            </span>
          )}
        </div>
        <div className="ride-page-header__actions">
          <button className="ride-btn ride-btn--outline" onClick={fetchDetail}>↻ Refresh</button>
          <button className="ride-btn ride-btn--outline" onClick={() => navigate(`/rides/${detail.rideId}`)}>
            View Ride →
          </button>
        </div>
      </div>

      {/* ── Two Column Grid ──────────────────────────────── */}
      <div className="ride-detail-grid">
        {/* Left Column */}
        <div className="ride-detail-col">
          {/* Map Card */}
          <div className="ride-map-card">
            <div className="ride-map-card__header">
              <span className="ride-map-card__title">GPS Route</span>
              {detail.rideDistanceKm && (
                <span style={{ fontSize: 'var(--hj-text-sm)', color: 'var(--hj-text-secondary)' }}>
                  {detail.rideDistanceKm.toFixed(1)} km
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
                <p className="ride-address-card__item-value">{detail.pickupAddress || 'N/A'}</p>
                <p className="ride-address-card__item-coords">
                  {detail.pickupLatitude.toFixed(5)}, {detail.pickupLongitude.toFixed(5)}
                </p>
              </div>
              <div>
                <p className="ride-address-card__item-label">Destination</p>
                <p className="ride-address-card__item-value">{detail.dropoffAddress || 'N/A'}</p>
                <p className="ride-address-card__item-coords">
                  {detail.dropoffLatitude.toFixed(5)}, {detail.dropoffLongitude.toFixed(5)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Fare Breakdown */}
          <div className="ride-info-card">
            <h3 className="ride-info-card__title">Payment Breakdown (Cash)</h3>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Base Fare</span>
              <span className="ride-info-row__value">₹{detail.baseFare.toFixed(0)}</span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Distance</span>
              <span className="ride-info-row__value">₹{detail.distanceCharge.toFixed(0)}</span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Time</span>
              <span className="ride-info-row__value">₹{detail.timeCharge.toFixed(0)}</span>
            </div>
            {detail.tollCharges > 0 && (
              <div className="ride-info-row">
                <span className="ride-info-row__label">Toll</span>
                <span className="ride-info-row__value">₹{detail.tollCharges.toFixed(0)}</span>
              </div>
            )}
            {detail.waitingCharges > 0 && (
              <div className="ride-info-row">
                <span className="ride-info-row__label">Waiting</span>
                <span className="ride-info-row__value">₹{detail.waitingCharges.toFixed(0)}</span>
              </div>
            )}
            {detail.nightCharges > 0 && (
              <div className="ride-info-row">
                <span className="ride-info-row__label">Night</span>
                <span className="ride-info-row__value">₹{detail.nightCharges.toFixed(0)}</span>
              </div>
            )}
            {detail.promoDiscount > 0 && (
              <div className="ride-info-row">
                <span className="ride-info-row__label">Promo</span>
                <span className="ride-info-row__value" style={{ color: 'var(--hj-success)' }}>-₹{detail.promoDiscount.toFixed(0)}</span>
              </div>
            )}
            <div className="ride-info-row">
              <span className="ride-info-row__label">GST</span>
              <span className="ride-info-row__value">₹{(detail.gstAmount ?? detail.taxes).toFixed(0)}</span>
            </div>
            <div style={{ height: 1, background: 'var(--hj-border-light)', margin: '10px 0' }} />
            <div className="ride-info-row">
              <span className="ride-info-row__label">Total Fare</span>
              <span className="ride-info-row__value ride-info-row__value--bold" style={{ color: 'var(--hj-success)' }}>
                ₹{detail.totalFare.toFixed(0)}
              </span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Commission</span>
              <span className="ride-info-row__value" style={{ color: 'var(--hj-warning)' }}>
                ₹{(detail.platformCommission ?? 0).toFixed(0)}
              </span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Driver Earnings</span>
              <span className="ride-info-row__value" style={{ color: 'var(--hj-success)' }}>
                ₹{(detail.driverEarnings ?? 0).toFixed(0)}
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
                  color: detail.settlementStatus === 'COMPLETED' ? '#fff' : '#333',
                  background: detail.settlementStatus === 'COMPLETED' ? 'var(--hj-success)' : 'var(--hj-warning)',
                }}>
                  {detail.settlementStatus || 'PENDING'}
                </span>
              </span>
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
              <span className="ride-info-row__value">{detail.userName || 'N/A'}</span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Phone</span>
              {detail.userPhone ? (
                <a href={`tel:${detail.userPhone}`} className="ride-info-row__value ride-info-row__value--link">{detail.userPhone}</a>
              ) : (
                <span className="ride-info-row__value">N/A</span>
              )}
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Email</span>
              <span className="ride-info-row__value" style={{ fontSize: 'var(--hj-text-sm)' }}>{detail.userEmail || 'N/A'}</span>
            </div>
            {detail.userFlagged && (
              <div className="ride-info-row">
                <span className="ride-info-row__label">Flag</span>
                <span className="ride-info-row__value" style={{ color: 'var(--hj-danger)', fontWeight: 600 }}>⚠ Flagged</span>
              </div>
            )}
            {detail.userOutstandingBalance > 0 && (
              <div className="ride-info-row">
                <span className="ride-info-row__label">Outstanding</span>
                <span className="ride-info-row__value" style={{ color: '#E91E63', fontWeight: 700 }}>
                  ₹{detail.userOutstandingBalance.toFixed(0)}
                </span>
              </div>
            )}
            {detail.userOutstandingReason && (
              <div style={{ marginTop: 4, padding: '6px 10px', background: '#FCE4EC', borderRadius: 6, fontSize: 12, color: '#880E4F' }}>
                {detail.userOutstandingReason}
              </div>
            )}
          </div>

          {/* Driver Card */}
          <div className="ride-info-card">
            <h3 className="ride-info-card__title">🚗 Driver</h3>
            {detail.driverName ? (
              <>
                <div className="ride-info-row">
                  <span className="ride-info-row__label">Name</span>
                  <span className="ride-info-row__value">{detail.driverName}</span>
                </div>
                <div className="ride-info-row">
                  <span className="ride-info-row__label">Phone</span>
                  {detail.driverPhone ? (
                    <a href={`tel:${detail.driverPhone}`} className="ride-info-row__value ride-info-row__value--link">{detail.driverPhone}</a>
                  ) : (
                    <span className="ride-info-row__value">N/A</span>
                  )}
                </div>
                <div className="ride-info-row">
                  <span className="ride-info-row__label">Vehicle</span>
                  <span className="ride-info-row__value">{detail.driverVehicleType || ''} {detail.driverVehicleNumber || ''}</span>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 'var(--hj-text-base)', color: 'var(--hj-text-tertiary)' }}>
                No driver assigned
              </p>
            )}
          </div>

          {/* Cash Confirmation Card */}
          <div className="ride-info-card">
            <h3 className="ride-info-card__title">Cash Confirmation Status</h3>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Driver Confirmed</span>
              <span className="ride-info-row__value">
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: detail.driverConfirmed ? '#fff' : '#333',
                  background: detail.driverConfirmed ? 'var(--hj-success)' : 'var(--hj-warning)',
                }}>
                  {detail.driverConfirmed ? 'Yes' : 'No'}
                </span>
              </span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">User Confirmed</span>
              <span className="ride-info-row__value">
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: detail.userConfirmed ? '#fff' : '#333',
                  background: detail.userConfirmed ? 'var(--hj-success)' : 'var(--hj-warning)',
                }}>
                  {detail.userConfirmed ? 'Yes' : 'No'}
                </span>
              </span>
            </div>
            <div className="ride-info-row">
              <span className="ride-info-row__label">Reminders Sent</span>
              <span className="ride-info-row__value">{detail.reminderCount} / 3</span>
            </div>
            {detail.lastReminderAt && (
              <div className="ride-info-row">
                <span className="ride-info-row__label">Last Reminder</span>
                <span className="ride-info-row__value">{new Date(detail.lastReminderAt).toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Dispute Info Card */}
          {detail.disputeCategory && (
            <div className="ride-info-card">
              <h3 className="ride-info-card__title">Dispute Details</h3>
              <div className="ride-info-row">
                <span className="ride-info-row__label">Category</span>
                <span className="ride-info-row__value">{detail.disputeCategory}</span>
              </div>
              {detail.disputeComment && (
                <div className="ride-info-row">
                  <span className="ride-info-row__label">Comment</span>
                  <span className="ride-info-row__value" style={{ textAlign: 'right', maxWidth: '60%' }}>{detail.disputeComment}</span>
                </div>
              )}
              {detail.disputeFiledByUserName && (
                <div className="ride-info-row">
                  <span className="ride-info-row__label">Filed By</span>
                  <span className="ride-info-row__value">{detail.disputeFiledByUserName}</span>
                </div>
              )}
              <div className="ride-info-row">
                <span className="ride-info-row__label">Filed At</span>
                <span className="ride-info-row__value">{detail.disputedAt ? new Date(detail.disputedAt).toLocaleString('en-IN') : 'N/A'}</span>
              </div>
              {detail.disputeResolution && (
                <>
                  <div style={{ height: 1, background: 'var(--hj-border-light)', margin: '10px 0' }} />
                  <div className="ride-info-row">
                    <span className="ride-info-row__label">Resolution</span>
                    <span className="ride-info-row__value" style={{ textAlign: 'right', maxWidth: '60%' }}>{detail.disputeResolution}</span>
                  </div>
                  {detail.disputeResolvedAt && (
                    <div className="ride-info-row">
                      <span className="ride-info-row__label">Resolved At</span>
                      <span className="ride-info-row__value">{new Date(detail.disputeResolvedAt).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </>
              )}
              {detail.disputeImageUrl && (
                <div style={{ marginTop: 10 }}>
                  <a href={detail.disputeImageUrl} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--hj-primary)', fontSize: 13, fontWeight: 600 }}>
                    📷 View Dispute Image
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Refund Info */}
          {detail.refundId && (
            <div className="ride-info-card">
              <h3 className="ride-info-card__title">Refund</h3>
              <div className="ride-info-row">
                <span className="ride-info-row__label">Refund ID</span>
                <span className="ride-info-row__value" style={{ fontFamily: 'var(--hj-font-mono)', fontSize: 'var(--hj-text-xs)' }}>{detail.refundId}</span>
              </div>
              <div className="ride-info-row">
                <span className="ride-info-row__label">Amount</span>
                <span className="ride-info-row__value" style={{ color: 'var(--hj-success)' }}>₹{(detail.refundAmount ?? 0).toFixed(0)}</span>
              </div>
              <div className="ride-info-row">
                <span className="ride-info-row__label">Reason</span>
                <span className="ride-info-row__value">{detail.refundReason || 'N/A'}</span>
              </div>
            </div>
          )}

          {/* Previous Disputes */}
          {detail.previousDisputes.length > 0 && (
            <div className="ride-info-card">
              <h3 className="ride-info-card__title">Previous Disputes ({detail.previousDisputes.length})</h3>
              {detail.previousDisputes.map((d) => (
                <div key={d.paymentId} style={{ padding: '10px 0', borderBottom: '1px solid var(--hj-border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Ride HJ{d.rideId}</span>
                    <span style={{ fontSize: 11, color: '#E91E63', fontWeight: 600 }}>{d.ticketNumber || 'No ticket'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--hj-text-secondary)', marginTop: 4 }}>
                    {d.category} · ₹{d.amount.toFixed(0)} · {d.resolution || 'Pending'}
                  </div>
                  {d.disputedAt && (
                    <div style={{ fontSize: 11, color: 'var(--hj-text-tertiary)', marginTop: 2 }}>
                      {new Date(d.disputedAt).toLocaleDateString('en-IN')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* History Placeholders */}
          <div className="ride-info-card">
            <h3 className="ride-info-card__title">Ride Photos</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--hj-text-tertiary)' }}>
              No ride photos available
            </p>
          </div>
          <div className="ride-info-card">
            <h3 className="ride-info-card__title">Chat History</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--hj-text-tertiary)' }}>
              No chat messages for this ride
            </p>
          </div>
          <div className="ride-info-card">
            <h3 className="ride-info-card__title">Call History</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--hj-text-tertiary)' }}>
              No call logs for this ride
            </p>
          </div>
          <div className="ride-info-card">
            <h3 className="ride-info-card__title">Complaint History</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--hj-text-tertiary)' }}>
              No complaints filed for this ride
            </p>
          </div>

          {/* Admin Actions */}
          <div className="ride-actions-card">
            <h3 className="ride-actions-card__title">Admin Actions</h3>
            <div className="ride-actions-card__list">
              {detail.driverPhone && (
                <button className="ride-actions-card__btn ride-actions-card__btn--purple"
                  onClick={() => window.open(`tel:${detail.driverPhone}`, '_self')}>
                  📞 Call Driver
                </button>
              )}
              {detail.userPhone && (
                <button className="ride-actions-card__btn ride-actions-card__btn--green"
                  onClick={() => window.open(`tel:${detail.userPhone}`, '_self')}>
                  📞 Call Passenger
                </button>
              )}
              {detail.availableActions.includes('APPROVE_DRIVER_CLAIM') && (
                <button className="ride-actions-card__btn ride-actions-card__btn--green"
                  onClick={() => { setActionNotes(''); setActionModal('APPROVE_DRIVER_CLAIM'); }}>
                  ✅ Approve Driver Claim
                </button>
              )}
              {detail.availableActions.includes('APPROVE_PASSENGER_CLAIM') && (
                <button className="ride-actions-card__btn ride-actions-card__btn--green"
                  onClick={() => { setActionNotes(''); setActionModal('APPROVE_PASSENGER_CLAIM'); }}>
                  ✅ Approve Passenger Claim
                </button>
              )}
              {detail.availableActions.includes('REQUEST_MORE_INFO') && (
                <button className="ride-actions-card__btn ride-actions-card__btn--orange"
                  onClick={() => { setActionNotes(''); setActionModal('REQUEST_MORE_INFO'); }}>
                  📋 Request More Information
                </button>
              )}
              {detail.availableActions.includes('REFUND') && (
                <button className="ride-actions-card__btn ride-actions-card__btn--orange"
                  onClick={() => { setActionNotes(''); setActionModal('REFUND'); }}>
                  💸 Refund
                </button>
              )}
              {detail.availableActions.includes('MANUAL_SETTLEMENT') && (
                <button className="ride-actions-card__btn ride-actions-card__btn--orange"
                  onClick={() => { setActionNotes(''); setActionModal('MANUAL_SETTLEMENT'); }}>
                  ⚖️ Manual Settlement
                </button>
              )}
              {detail.availableActions.includes('CLOSE_CASE') && (
                <button className="ride-actions-card__btn ride-actions-card__btn--red"
                  onClick={() => { setActionNotes(''); setActionModal('CLOSE_CASE'); }}>
                  🔒 Close Case
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Modal ─────────────────────────────────── */}
      {actionModal && (
        <div className="ride-modal-overlay" onClick={() => setActionModal(null)}>
          <div className="ride-modal ride-modal--md" onClick={(e) => e.stopPropagation()}>
            <div className="ride-modal__header">
              <h2 className="ride-modal__title">
                {actionModal === 'APPROVE_DRIVER_CLAIM' && 'Approve Driver Claim'}
                {actionModal === 'APPROVE_PASSENGER_CLAIM' && 'Approve Passenger Claim'}
                {actionModal === 'REQUEST_MORE_INFO' && 'Request More Information'}
                {actionModal === 'REFUND' && 'Process Refund'}
                {actionModal === 'MANUAL_SETTLEMENT' && 'Manual Settlement'}
                {actionModal === 'CLOSE_CASE' && 'Close Case'}
              </h2>
              <button className="ride-modal__close" onClick={() => setActionModal(null)}>×</button>
            </div>

            {/* ── Driver Wins ──────────────────────────────── */}
            {actionModal === 'APPROVE_DRIVER_CLAIM' && (
              <div style={{ marginBottom: 16 }}>
                <p className="ride-modal__desc" style={{ marginBottom: 12 }}>
                  Approving the driver&apos;s claim confirms the cash payment was received.
                </p>
                <div style={{ background: '#E8F5E9', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1B5E20', marginBottom: 10 }}>What happens:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#2E7D32' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 18 }}>1.</span>
                      <span><strong>Ride</strong> — Status marked <span style={{ fontWeight: 700 }}>Completed</span></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 18 }}>2.</span>
                      <span><strong>Driver Wallet</strong> — ₹{(detail.driverEarnings ?? (detail.totalFare - (detail.platformCommission ?? 0))).toFixed(0)} credited as ride earnings</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 18 }}>3.</span>
                      <span><strong>Passenger</strong> — Outstanding balance of ₹{detail.totalFare.toFixed(0)} added</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 18 }}>4.</span>
                      <span><strong>Notification</strong> — Passenger notified: &ldquo;Your cash payment could not be verified&rdquo;</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 18 }}>5.</span>
                      <span><strong>Future restriction</strong> — Passenger cannot book another ride until outstanding cleared</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Passenger Wins ───────────────────────────── */}
            {actionModal === 'APPROVE_PASSENGER_CLAIM' && (
              <div style={{ marginBottom: 16 }}>
                <p className="ride-modal__desc" style={{ marginBottom: 12 }}>
                  Approving the passenger&apos;s claim refunds them and closes the dispute.
                </p>
                <div style={{ background: '#E3F2FD', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0D47A1', marginBottom: 10 }}>What happens:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#1565C0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 18 }}>1.</span>
                      <span><strong>Ride</strong> — Status stays <span style={{ fontWeight: 700 }}>Completed</span></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 18 }}>2.</span>
                      <span><strong>Passenger</strong> — Refund of ₹{detail.totalFare.toFixed(0)} processed</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 18 }}>3.</span>
                      <span><strong>Driver</strong> — Cannot claim again for this ride (ticket closed)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 18 }}>4.</span>
                      <span><strong>Admin</strong> — Case closed, dispute resolved</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Other actions ────────────────────────────── */}
            {actionModal !== 'APPROVE_DRIVER_CLAIM' && actionModal !== 'APPROVE_PASSENGER_CLAIM' && (
              <p className="ride-modal__desc">
                {actionModal === 'REQUEST_MORE_INFO' && 'Add a note for the passenger/driver with additional information needed.'}
                {actionModal === 'REFUND' && 'Process a full refund to the passenger. The payment status will change to REFUNDED.'}
                {actionModal === 'MANUAL_SETTLEMENT' && 'Manually settle this dispute. Add resolution notes below.'}
                {actionModal === 'CLOSE_CASE' && 'Close this dispute case without a refund. Add resolution notes.'}
              </p>
            )}

            <label className="ride-modal__label">
              {actionModal === 'REQUEST_MORE_INFO' ? 'What information do you need?' : 'Resolution Notes'}
            </label>
            <textarea
              className="ride-modal__input"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder={
                actionModal === 'REQUEST_MORE_INFO'
                  ? 'e.g. Please share payment screenshot…'
                  : 'e.g. Resolved after verifying with both parties…'
              }
              rows={3}
              style={{ resize: 'vertical', minHeight: 70 }}
            />
            <div className="ride-modal__footer">
              <button className="ride-btn ride-btn--outline" onClick={() => setActionModal(null)}>
                Cancel
              </button>
              <button
                className="ride-btn ride-btn--primary"
                onClick={() => handleAction(actionModal)}
                disabled={actionLoading}
                style={{ opacity: actionLoading ? 0.7 : 1 }}
              >
                {actionLoading ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
