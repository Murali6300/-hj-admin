import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

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
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: '#FF9800',
  ACCEPTED: '#2196F3',
  DRIVER_EN_ROUTE: '#9C27B0',
  DRIVER_ARRIVED: '#00BCD4',
  IN_PROGRESS: '#1A73E8',
  COMPLETED: '#4CAF50',
  CANCELLED: '#F44336',
};

interface TimelineStep {
  label: string;
  time: string | null;
  completed: boolean;
  current: boolean;
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

  const steps: TimelineStep[] = [
    { label: 'Booked', time: ride.createdAt, completed: true, current: currentIdx === 0 },
    { label: 'Driver Assigned', time: ride.acceptedAt, completed: currentIdx >= 1, current: currentIdx === 1 },
    { label: 'Driver Arrived', time: currentIdx >= 3 ? ride.startedAt : null, completed: currentIdx >= 3, current: currentIdx === 3 },
    { label: 'OTP Verified', time: currentIdx >= 4 ? ride.startedAt : null, completed: currentIdx >= 4, current: currentIdx === 4 },
    { label: 'Ride Started', time: ride.startedAt, completed: currentIdx >= 4, current: currentIdx === 4 },
    { label: 'Ride Completed', time: ride.completedAt, completed: currentIdx >= 5, current: currentIdx === 5 },
  ];

  return steps;
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
        html: '<div style="background:#4CAF50;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
        iconSize: [12, 12],
        className: '',
      });

      const destIcon = (L as { divIcon: (opts: unknown) => unknown }).divIcon({
        html: '<div style="background:#F44336;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
        iconSize: [12, 12],
        className: '',
      });

      (L as { marker: (latlng: number[], opts: unknown) => { addTo: (m: unknown) => unknown } }).marker(pickupLatLng, { icon: markerIcon }).addTo(map);
      (L as { marker: (latlng: number[], opts: unknown) => { addTo: (m:unknown) => unknown } }).marker(destLatLng, { icon: destIcon }).addTo(map);

      const polyline = (L as { polyline: (coords: number[][], opts: unknown) => { addTo: (m: unknown) => unknown } }).polyline(
        [pickupLatLng, destLatLng],
        { color: '#1A73E8', weight: 3, opacity: 0.7, dashArray: '8, 8' },
      );
      polyline.addTo(map);

      const bounds = (L as { latLngBounds: (coords: number[][]) => { fitBounds: (m: unknown, b: unknown, opts: unknown) => unknown } }).latLngBounds([pickupLatLng, destLatLng]);
      (map as { fitBounds: (b: unknown, opts: unknown) => unknown }).fitBounds(bounds, { padding: [40, 40] });
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

  if (loading) return <p style={{ fontSize: 14, color: '#757575' }}>Loading ride details...</p>;
  if (error || !ride) return <p style={{ fontSize: 14, color: '#F44336' }}>{error || 'Ride not found'}</p>;

  const timeline = getTimeline(ride);
  const isActive = !['COMPLETED', 'CANCELLED'].includes(ride.status);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/rides')} style={{ padding: '6px 12px', background: '#E0E0E0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>← Back</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Ride #{ride.id}</h1>
            <span style={{ fontSize: 12, color: '#757575' }}>Created {new Date(ride.createdAt).toLocaleString('en-IN')}</span>
          </div>
          <span style={{
            padding: '4px 12px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            background: `${STATUS_COLORS[ride.status] || '#9E9E9E'}22`,
            color: STATUS_COLORS[ride.status] || '#9E9E9E',
          }}>
            {ride.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Map */}
          <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E0E0E0' }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Route Map</h3>
            </div>
            <div ref={mapRef} style={{ height: 300, width: '100%' }} />
            <div style={{ padding: '8px 16px', display: 'flex', gap: 16, fontSize: 11, color: '#757575', borderTop: '1px solid #E0E0E0' }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#4CAF50', marginRight: 4 }} /> Pickup</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#F44336', marginRight: 4 }} /> Destination</span>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14 }}>Ride Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {timeline.map((step, i) => (
                <div key={step.label} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  {/* Line + Dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: step.completed ? (step.current ? '#1A73E8' : '#4CAF50') : '#E0E0E0',
                      border: step.current ? '3px solid #BBDEFB' : 'none',
                      flexShrink: 0,
                    }} />
                    {i < timeline.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: step.completed ? '#4CAF50' : '#E0E0E0', minHeight: 24 }} />
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: 16 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: step.current ? 700 : 500, color: step.completed ? '#333' : '#9E9E9E' }}>
                      {step.label}
                    </p>
                    {step.time && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#757575' }}>
                        {new Date(step.time).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Addresses */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: '#757575', fontWeight: 600, textTransform: 'uppercase' }}>Pickup</p>
                <p style={{ margin: 0, fontSize: 13 }}>{ride.pickupAddress}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9E9E9E' }}>{ride.pickupLatitude.toFixed(5)}, {ride.pickupLongitude.toFixed(5)}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: '#757575', fontWeight: 600, textTransform: 'uppercase' }}>Destination</p>
                <p style={{ margin: 0, fontSize: 13 }}>{ride.dropoffAddress}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9E9E9E' }}>{ride.dropoffLatitude.toFixed(5)}, {ride.dropoffLongitude.toFixed(5)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* User Card */}
          <InfoCard title="Passenger">
            <InfoRow label="Name" value={ride.userName} />
            <InfoRow label="Phone" value={ride.userPhone || 'N/A'} link={ride.userPhone ? `tel:${ride.userPhone}` : undefined} />
            <InfoRow label="User ID" value={`#${ride.userId}`} />
          </InfoCard>

          {/* Driver Card */}
          <InfoCard title="Driver">
            {ride.driverName !== 'Unassigned' ? (
              <>
                <InfoRow label="Name" value={ride.driverName} />
                <InfoRow label="Phone" value={ride.driverPhone || 'N/A'} link={ride.driverPhone ? `tel:${ride.driverPhone}` : undefined} />
                <InfoRow label="Vehicle" value={`${ride.driverVehicleType || ''} ${ride.driverVehicleMake || ''}`} />
                <InfoRow label="Plate" value={ride.driverVehiclePlate || 'N/A'} />
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: '#9E9E9E' }}>No driver assigned</p>
            )}
          </InfoCard>

          {/* Fare & Payment */}
          <InfoCard title="Fare & Payment">
            <InfoRow label="Estimated Fare" value={ride.estimatedFare ? `₹${ride.estimatedFare.toFixed(0)}` : 'N/A'} />
            <InfoRow label="Actual Fare" value={ride.actualFare ? `₹${ride.actualFare.toFixed(0)}` : 'Pending'} bold />
            <InfoRow label="Distance" value={ride.distanceKm ? `${ride.distanceKm.toFixed(1)} km` : 'N/A'} />
            <InfoRow label="Duration" value={ride.durationMinutes ? `${ride.durationMinutes} min` : 'N/A'} />
            <InfoRow label="Surge" value={`${ride.surgeMultiplier}x`} />
            <div style={{ height: 1, background: '#E0E0E0', margin: '8px 0' }} />
            <InfoRow label="Payment" value={ride.paymentStatus || 'N/A'} />
            <InfoRow label="Method" value={ride.paymentMethod || 'N/A'} />
            {ride.transactionId && <InfoRow label="Transaction" value={ride.transactionId} />}
          </InfoCard>

          {/* Cancellation Info */}
          {ride.status === 'CANCELLED' && (
            <InfoCard title="Cancellation">
              <InfoRow label="Reason" value={ride.cancellationReason || 'N/A'} />
              <InfoRow label="Cancelled By" value={ride.cancelledBy || 'N/A'} />
            </InfoCard>
          )}

          {/* Actions */}
          {isActive && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ride.driverPhone && (
                  <button onClick={() => window.open(`tel:${ride.driverPhone}`, '_self')} style={actionBtnStyle('#9C27B0')}>
                    📞 Contact Driver
                  </button>
                )}
                {ride.userPhone && (
                  <button onClick={() => window.open(`tel:${ride.userPhone}`, '_self')} style={actionBtnStyle('#4CAF50')}>
                    📞 Contact User
                  </button>
                )}
                {(ride.status === 'ACCEPTED' || ride.status === 'DRIVER_EN_ROUTE') && (
                  <button onClick={handleReassign} style={actionBtnStyle('#FF6D00')}>
                    🔄 Reassign Driver
                  </button>
                )}
                {!['COMPLETED', 'CANCELLED'].includes(ride.status) && (
                  <button onClick={() => setCancelModal(true)} style={actionBtnStyle('#F44336')}>
                    ✕ Cancel Ride
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Cancel Ride #{ride.id}</h2>
              <button onClick={() => setCancelModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
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
              <button onClick={() => setCancelModal(false)} style={{ padding: '8px 16px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Go Back</button>
              <button onClick={handleCancelRide} style={{ padding: '8px 16px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, bold, link }: { label: string; value: string; bold?: boolean; link?: string }) {
  const content = (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: '#757575' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: link ? '#1565C0' : '#333' }}>{value}</span>
    </div>
  );

  if (link) {
    return <a href={link} style={{ textDecoration: 'none', display: 'block' }}>{content}</a>;
  }
  return content;
}

const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxHeight: '85vh', overflow: 'auto' };
const actionBtnStyle = (color: string): React.CSSProperties => ({
  padding: '10px 16px',
  background: `${color}15`,
  color,
  border: `1px solid ${color}30`,
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
});
