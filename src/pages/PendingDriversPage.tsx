import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { getVehicleIcon, getVehicleColor } from '../utils/vehicleIcons';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DriverListResponse {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  vehicleType: string;
  vehicleNumber: string;
  vehicleBrand: string;
  vehicleModel: string;
  availabilityStatus: string;
  accountStatus: string;
  documentVerificationStatus: string;
  averageRating: number;
  ratingCount: number;
  totalEarnings: number;
  totalRides: number;
  profilePhotoUrl: string | null;
  createdAt: string;
}

interface DocumentSummary {
  id: number;
  dlNumber: string; dlExpiry: string; dlFrontUrl: string; dlBackUrl: string;
  rcNumber: string; rcFrontUrl: string; rcBackUrl: string;
  aadhaarNumber: string; aadhaarFrontUrl: string; aadhaarBackUrl: string;
  panNumber: string; panUrl: string;
  insuranceProvider: string; insurancePolicyNumber: string; insuranceExpiry: string; insuranceImageUrl: string;
  selfieUrl: string;
  vehicleFrontUrl: string; vehicleBackUrl: string;
  verificationStatus: string; remarks: string;
  emergencyContactName: string; emergencyContactPhone: string; emergencyContactRelationship: string;
}

interface DriverDetailResponse {
  driverInfo: DriverListResponse;
  documents: DocumentSummary | null;
  earnings: any;
  recentRides: any[];
  ratingsReceived: any[];
  wallet: any;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PendingDriversPage() {
  const [drivers, setDrivers] = useState<DriverListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Detail modal
  const [detail, setDetail] = useState<DriverDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reject modal
  const [rejectDriver, setRejectDriver] = useState<DriverListResponse | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Re-upload modal
  const [reuploadDriver, setReuploadDriver] = useState<DriverListResponse | null>(null);
  const [reuploadReason, setReuploadReason] = useState('');

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/drivers', { params: { status: 'DOCUMENTS_UNDER_REVIEW', size: 100 } });
      setDrivers(res.data.drivers || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleViewDetail = async (driverId: number) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/drivers/${driverId}`);
      setDetail(res.data);
    } catch { /* ignore */ } finally { setDetailLoading(false); }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this driver? They will be able to accept rides.')) return;
    setActionLoading(id);
    try {
      await api.put(`/drivers/${id}/approve`, { remarks: 'Approved by admin' });
      fetchPending();
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectDriver) return;
    setActionLoading(rejectDriver.id);
    try {
      await api.put(`/drivers/${rejectDriver.id}/reject`, { remarks: rejectReason || 'Documents do not meet requirements' });
      setRejectDriver(null);
      setRejectReason('');
      fetchPending();
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleRequestReupload = async () => {
    if (!reuploadDriver) return;
    setActionLoading(reuploadDriver.id);
    try {
      await api.put(`/drivers/${reuploadDriver.id}/request-reupload`, { remarks: reuploadReason || 'Please re-upload your documents' });
      setReuploadDriver(null);
      setReuploadReason('');
      fetchPending();
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Pending Driver Approvals</h1>
        <span style={{ fontSize: 13, color: '#757575' }}>{drivers.length} pending</span>
      </div>

      {loading ? <p>Loading pending drivers...</p> : drivers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 18, color: '#4CAF50', margin: 0 }}>✓ All caught up!</p>
          <p style={{ color: '#757575', marginTop: 8 }}>No pending driver approvals.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {drivers.map((driver) => (
            <div key={driver.id} style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #FF9800' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                {/* Driver Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: getVehicleColor(driver.vehicleType), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {getVehicleIcon(driver.vehicleType)}
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{driver.name}</p>
                    <p style={{ fontSize: 13, color: '#555', margin: '2px 0 0' }}>{driver.email} • {driver.phoneNumber}</p>
                    <p style={{ fontSize: 12, color: '#999', margin: '2px 0 0' }}>
                      {driver.vehicleType} • {driver.vehicleNumber} • {driver.vehicleBrand} {driver.vehicleModel}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => handleViewDetail(driver.id)} disabled={detailLoading}
                    style={{ padding: '8px 14px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                    View Documents
                  </button>
                  <button onClick={() => handleApprove(driver.id)} disabled={actionLoading === driver.id}
                    style={{ padding: '8px 14px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    {actionLoading === driver.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button onClick={() => { setRejectDriver(driver); setRejectReason(''); }}
                    style={{ padding: '8px 14px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                    Reject
                  </button>
                  <button onClick={() => { setReuploadDriver(driver); setReuploadReason(''); }}
                    style={{ padding: '8px 14px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                    Request Re-upload
                  </button>
                </div>
              </div>

              <p style={{ fontSize: 11, color: '#999', margin: '8px 0 0' }}>
                Applied: {new Date(driver.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Document Detail Modal */}
      {(detail || detailLoading) && (
        <div style={modalOverlay} onClick={() => setDetail(null)}>
          <div style={{ ...modalContent, maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Driver Documents — {detail?.driverInfo.name}</h2>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            {detailLoading ? <p>Loading documents...</p> : detail && (
              <>
                {/* Driver Quick Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: getVehicleColor(detail.driverInfo.vehicleType), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {getVehicleIcon(detail.driverInfo.vehicleType)}
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{detail.driverInfo.name}</p>
                    <p style={{ fontSize: 12, color: '#555', margin: 0 }}>{detail.driverInfo.vehicleType} • {detail.driverInfo.vehicleNumber}</p>
                  </div>
                </div>

                {detail.documents ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <DocCard title="Driving License" icon="🪪" items={[
                      { label: 'DL Number', value: detail.documents.dlNumber },
                      { label: 'Expiry', value: detail.documents.dlExpiry },
                    ]} images={[
                      { label: 'Front', url: detail.documents.dlFrontUrl },
                      { label: 'Back', url: detail.documents.dlBackUrl },
                    ]} />

                    <DocCard title="RC" icon="📋" items={[
                      { label: 'RC Number', value: detail.documents.rcNumber },
                    ]} images={[
                      { label: 'Front', url: detail.documents.rcFrontUrl },
                      { label: 'Back', url: detail.documents.rcBackUrl },
                    ]} />

                    <DocCard title="Aadhaar" icon="🆔" items={[
                      { label: 'Number', value: detail.documents.aadhaarNumber },
                    ]} images={[
                      { label: 'Front', url: detail.documents.aadhaarFrontUrl },
                      { label: 'Back', url: detail.documents.aadhaarBackUrl },
                    ]} />

                    <DocCard title="PAN" icon="💳" items={[
                      { label: 'Number', value: detail.documents.panNumber },
                    ]} images={[
                      { label: 'Image', url: detail.documents.panUrl },
                    ]} />

                    <DocCard title="Insurance" icon="🛡️" items={[
                      { label: 'Provider', value: detail.documents.insuranceProvider },
                      { label: 'Policy #', value: detail.documents.insurancePolicyNumber },
                      { label: 'Expiry', value: detail.documents.insuranceExpiry },
                    ]} images={[
                      { label: 'Image', url: detail.documents.insuranceImageUrl },
                    ]} />

                    <DocCard title="Selfie" icon="🤳" items={[]} images={[
                      { label: 'Photo', url: detail.documents.selfieUrl },
                    ]} />

                    {detail.documents.emergencyContactName && (
                      <div style={{ padding: 12, background: '#f9f9f9', borderRadius: 6, border: '1px solid #E0E0E0' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Emergency Contact</p>
                        <p style={{ fontSize: 12, margin: 0 }}>{detail.documents.emergencyContactName} • {detail.documents.emergencyContactPhone} ({detail.documents.emergencyContactRelationship})</p>
                      </div>
                    )}

                    {detail.documents.remarks && (
                      <div style={{ padding: 12, background: '#FFF3E0', borderRadius: 6, border: '1px solid #FFE0B2' }}>
                        <p style={{ fontSize: 12, margin: 0, color: '#E65100' }}>Remarks: {detail.documents.remarks}</p>
                      </div>
                    )}
                  </div>
                ) : <p style={{ color: '#999' }}>No documents uploaded yet.</p>}

                {/* Quick Actions in Modal */}
                <div style={{ display: 'flex', gap: 8, marginTop: 20, borderTop: '1px solid #E0E0E0', paddingTop: 16 }}>
                  <button onClick={() => { handleApprove(detail.driverInfo.id); setDetail(null); }}
                    style={{ padding: '10px 20px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Approve Driver
                  </button>
                  <button onClick={() => { setDetail(null); setRejectDriver(detail.driverInfo); setRejectReason(''); }}
                    style={{ padding: '10px 20px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                    Reject
                  </button>
                  <button onClick={() => { setDetail(null); setReuploadDriver(detail.driverInfo); setReuploadReason(''); }}
                    style={{ padding: '10px 20px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                    Request Re-upload
                  </button>
                  <button onClick={() => setDetail(null)} style={{ marginLeft: 'auto', padding: '10px 20px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectDriver && (
        <div style={modalOverlay} onClick={() => setRejectDriver(null)}>
          <div style={{ ...modalContent, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Reject Driver</h2>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>Rejecting <strong>{rejectDriver.name}</strong>. Provide a reason:</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleReject} disabled={actionLoading === rejectDriver.id}
                style={{ flex: 1, padding: '10px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {actionLoading === rejectDriver.id ? 'Rejecting...' : 'Confirm Reject'}
              </button>
              <button onClick={() => setRejectDriver(null)} style={{ flex: 1, padding: '10px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Re-upload Modal */}
      {reuploadDriver && (
        <div style={modalOverlay} onClick={() => setReuploadDriver(null)}>
          <div style={{ ...modalContent, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Request Document Re-upload</h2>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>Requesting <strong>{reuploadDriver.name}</strong> to re-upload documents:</p>
            <textarea value={reuploadReason} onChange={(e) => setReuploadReason(e.target.value)}
              placeholder="Which documents need re-uploading and why..."
              style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleRequestReupload} disabled={actionLoading === reuploadDriver.id}
                style={{ flex: 1, padding: '10px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {actionLoading === reuploadDriver.id ? 'Sending...' : 'Send Request'}
              </button>
              <button onClick={() => setReuploadDriver(null)} style={{ flex: 1, padding: '10px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DocCard({ title, icon, items, images }: { title: string; icon: string; items: { label: string; value: string }[]; images: { label: string; url: string }[] }) {
  return (
    <div style={{ padding: 14, background: '#f9f9f9', borderRadius: 8, border: '1px solid #E0E0E0' }}>
      <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>{icon} {title}</p>
      {items.length > 0 && items.filter(i => i.value).length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          {items.filter(i => i.value).map(i => (
            <span key={i.label} style={{ fontSize: 12 }}><span style={{ color: '#999' }}>{i.label}:</span> <strong>{i.value}</strong></span>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {images.filter(i => i.url).map(img => (
            <a key={img.label} href={img.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '6px 12px', background: '#E3F2FD', color: '#1565C0', borderRadius: 4, fontSize: 12, textDecoration: 'none' }}>
              {img.label} ↗
            </a>
          ))}
          {images.filter(i => !i.url).map(img => (
            <span key={img.label} style={{ padding: '6px 12px', background: '#FFEBEE', color: '#C62828', borderRadius: 4, fontSize: 12 }}>
              {img.label} — Not uploaded
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '95%', maxHeight: '90vh', overflow: 'auto' };
