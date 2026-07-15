import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { getVehicleIcon, getVehicleColor } from '../utils/vehicleIcons';

function getDocumentUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/uploads/')) {
    const base = import.meta.env.VITE_API_BASE_URL || '';
    return `${base}${url}`;
  }
  return url;
}

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
  // Per-document verification status
  dlStatus: string; dlRemarks: string;
  rcStatus: string; rcRemarks: string;
  aadhaarStatus: string; aadhaarRemarks: string;
  panStatus: string; panRemarks: string;
  selfieStatus: string; selfieRemarks: string;
  vehiclePhotosStatus: string; vehiclePhotosRemarks: string;
  insuranceStatus: string; insuranceRemarks: string;
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

  // Document image lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState('');

  // Per-document status modal
  const [docStatusModal, setDocStatusModal] = useState<{ driverId: number; driverName: string; docType: string; docLabel: string } | null>(null);
  const [docStatusAction, setDocStatusAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [docStatusRemarks, setDocStatusRemarks] = useState('');

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

  const handleUpdateDocStatus = async () => {
    if (!docStatusModal) return;
    const { driverId, docType } = docStatusModal;
    setActionLoading(driverId);
    try {
      await api.put(`/drivers/${driverId}/document-status`, {
        documentType: docType,
        status: docStatusAction,
        remarks: docStatusRemarks || undefined,
      });
      setDocStatusModal(null);
      setDocStatusRemarks('');
      // Refresh detail if open
      if (detail && detail.driverInfo.id === driverId) {
        handleViewDetail(driverId);
      }
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
                      { label: 'DL Front', url: detail.documents.dlFrontUrl },
                      { label: 'DL Back', url: detail.documents.dlBackUrl },
                    ]} onImageClick={(label, url) => { setPreviewLabel(label); setPreviewImage(url); }}
                    docType="dl" docStatus={detail.documents.dlStatus} docRemarks={detail.documents.dlRemarks}
                    driverId={detail.driverInfo.id} driverName={detail.driverInfo.name}
                    onStatusChange={(id, name, docType, docLabel) => { setDocStatusModal({ driverId: id, driverName: name, docType, docLabel: docLabel }); setDocStatusAction('APPROVED'); setDocStatusRemarks(''); }} />

                    <DocCard title="RC" icon="📋" items={[
                      { label: 'RC Number', value: detail.documents.rcNumber },
                    ]} images={[
                      { label: 'RC Front', url: detail.documents.rcFrontUrl },
                      { label: 'RC Back', url: detail.documents.rcBackUrl },
                    ]} onImageClick={(label, url) => { setPreviewLabel(label); setPreviewImage(url); }}
                    docType="rc" docStatus={detail.documents.rcStatus} docRemarks={detail.documents.rcRemarks}
                    driverId={detail.driverInfo.id} driverName={detail.driverInfo.name}
                    onStatusChange={(id, name, docType, docLabel) => { setDocStatusModal({ driverId: id, driverName: name, docType, docLabel: docLabel }); setDocStatusAction('APPROVED'); setDocStatusRemarks(''); }} />

                    <DocCard title="Aadhaar" icon="🆔" items={[
                      { label: 'Number', value: detail.documents.aadhaarNumber },
                    ]} images={[
                      { label: 'Aadhaar Front', url: detail.documents.aadhaarFrontUrl },
                      { label: 'Aadhaar Back', url: detail.documents.aadhaarBackUrl },
                    ]} onImageClick={(label, url) => { setPreviewLabel(label); setPreviewImage(url); }}
                    docType="aadhaar" docStatus={detail.documents.aadhaarStatus} docRemarks={detail.documents.aadhaarRemarks}
                    driverId={detail.driverInfo.id} driverName={detail.driverInfo.name}
                    onStatusChange={(id, name, docType, docLabel) => { setDocStatusModal({ driverId: id, driverName: name, docType, docLabel: docLabel }); setDocStatusAction('APPROVED'); setDocStatusRemarks(''); }} />

                    <DocCard title="PAN" icon="💳" items={[
                      { label: 'Number', value: detail.documents.panNumber },
                    ]} images={[
                      { label: 'PAN Card', url: detail.documents.panUrl },
                    ]} onImageClick={(label, url) => { setPreviewLabel(label); setPreviewImage(url); }}
                    docType="pan" docStatus={detail.documents.panStatus} docRemarks={detail.documents.panRemarks}
                    driverId={detail.driverInfo.id} driverName={detail.driverInfo.name}
                    onStatusChange={(id, name, docType, docLabel) => { setDocStatusModal({ driverId: id, driverName: name, docType, docLabel: docLabel }); setDocStatusAction('APPROVED'); setDocStatusRemarks(''); }} />

                    <DocCard title="Insurance" icon="🛡️" items={[
                      { label: 'Provider', value: detail.documents.insuranceProvider },
                      { label: 'Policy #', value: detail.documents.insurancePolicyNumber },
                      { label: 'Expiry', value: detail.documents.insuranceExpiry },
                    ]} images={[
                      { label: 'Insurance Policy', url: detail.documents.insuranceImageUrl },
                    ]} onImageClick={(label, url) => { setPreviewLabel(label); setPreviewImage(url); }}
                    docType="insurance" docStatus={detail.documents.insuranceStatus} docRemarks={detail.documents.insuranceRemarks}
                    driverId={detail.driverInfo.id} driverName={detail.driverInfo.name}
                    onStatusChange={(id, name, docType, docLabel) => { setDocStatusModal({ driverId: id, driverName: name, docType, docLabel: docLabel }); setDocStatusAction('APPROVED'); setDocStatusRemarks(''); }} />

                    <DocCard title="Selfie" icon="🤳" items={[]} images={[
                      { label: 'Driver Selfie', url: detail.documents.selfieUrl },
                    ]} onImageClick={(label, url) => { setPreviewLabel(label); setPreviewImage(url); }}
                    docType="selfie" docStatus={detail.documents.selfieStatus} docRemarks={detail.documents.selfieRemarks}
                    driverId={detail.driverInfo.id} driverName={detail.driverInfo.name}
                    onStatusChange={(id, name, docType, docLabel) => { setDocStatusModal({ driverId: id, driverName: name, docType, docLabel: docLabel }); setDocStatusAction('APPROVED'); setDocStatusRemarks(''); }} />

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

      {/* Per-document Status Modal */}
      {docStatusModal && (
        <div style={modalOverlay} onClick={() => setDocStatusModal(null)}>
          <div style={{ ...modalContent, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Review: {docStatusModal.docLabel}</h2>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
              {docStatusModal.driverName} — <strong>{docStatusModal.docLabel}</strong>
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => setDocStatusAction('APPROVED')}
                style={{ flex: 1, padding: '10px', background: docStatusAction === 'APPROVED' ? '#4CAF50' : '#E0E0E0', color: docStatusAction === 'APPROVED' ? '#fff' : '#333', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Approve
              </button>
              <button onClick={() => setDocStatusAction('REJECTED')}
                style={{ flex: 1, padding: '10px', background: docStatusAction === 'REJECTED' ? '#F44336' : '#E0E0E0', color: docStatusAction === 'REJECTED' ? '#fff' : '#333', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Reject
              </button>
            </div>

            <textarea value={docStatusRemarks} onChange={(e) => setDocStatusRemarks(e.target.value)}
              placeholder={docStatusAction === 'REJECTED' ? 'Reason for rejection (required for rejected docs)...' : 'Optional remarks...'}
              style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleUpdateDocStatus} disabled={actionLoading === docStatusModal.driverId}
                style={{ flex: 1, padding: '10px', background: docStatusAction === 'APPROVED' ? '#4CAF50' : '#F44336', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {actionLoading === docStatusModal.driverId ? 'Updating...' : docStatusAction === 'APPROVED' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
              <button onClick={() => setDocStatusModal(null)} style={{ flex: 1, padding: '10px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Document Image Lightbox */}
      {previewImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}
          onClick={() => setPreviewImage(null)}>
          <button onClick={() => setPreviewImage(null)}
            style={{ position: 'absolute', top: 16, right: 24, background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer', zIndex: 2001, lineHeight: 1 }}>
            ×
          </button>
          <span style={{ color: '#fff', fontSize: 14, marginBottom: 12, fontWeight: 600, letterSpacing: 0.5 }}>{previewLabel}</span>
          <div style={{ maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={getDocumentUrl(previewImage)}
              alt={previewLabel}
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.style.cssText = 'padding:40px;background:#333;border-radius:8px;color:#aaa;text-align:center;font-size:14px;min-width:200px;';
                fallback.textContent = 'Failed to load image';
                target.parentElement?.appendChild(fallback);
              }}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 4 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DocCard({ title, icon, items, images, onImageClick, docType, docStatus, docRemarks, driverId, driverName, onStatusChange }: {
  title: string; icon: string; items: { label: string; value: string }[]; images: { label: string; url: string }[];
  onImageClick?: (label: string, url: string) => void;
  docType?: string; docStatus?: string; docRemarks?: string;
  driverId?: number; driverName?: string;
  onStatusChange?: (driverId: number, driverName: string, docType: string, docLabel: string) => void;
}) {
  const statusColor = docStatus === 'APPROVED' ? '#4CAF50' : docStatus === 'REJECTED' ? '#F44336' : docStatus === 'UNDER_REVIEW' ? '#FF9800' : '#9E9E9E';
  const statusLabel = docStatus === 'APPROVED' ? 'Approved' : docStatus === 'REJECTED' ? 'Rejected' : docStatus === 'UNDER_REVIEW' ? 'Under Review' : 'Pending';

  return (
    <div style={{ padding: 14, background: '#f9f9f9', borderRadius: 8, border: `1px solid ${docStatus === 'REJECTED' ? '#FFCDD2' : '#E0E0E0'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{icon} {title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {docStatus && (
            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: statusColor + '20', color: statusColor }}>
              {statusLabel}
            </span>
          )}
          {docType && driverId != null && driverName && onStatusChange && docStatus !== 'APPROVED' && (
            <button onClick={() => onStatusChange(driverId, driverName, docType, title)}
              style={{ padding: '3px 8px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>
              Review
            </button>
          )}
        </div>
      </div>
      {items.length > 0 && items.filter(i => i.value).length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          {items.filter(i => i.value).map(i => (
            <span key={i.label} style={{ fontSize: 12 }}><span style={{ color: '#999' }}>{i.label}:</span> <strong>{i.value}</strong></span>
          ))}
        </div>
      )}
      {docRemarks && (
        <p style={{ fontSize: 12, color: '#E65100', margin: '4px 0 8px', fontStyle: 'italic' }}>Remark: {docRemarks}</p>
      )}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {images.filter(i => i.url).map(img => (
            <div key={img.label}
              onClick={() => onImageClick?.(img.label, img.url)}
              style={{ position: 'relative', width: 120, height: 80, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '1px solid #ddd', flexShrink: 0 }}>
              <img
                src={getDocumentUrl(img.url)}
                alt={img.label}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('[data-fallback]')) {
                    const fallback = document.createElement('div');
                    fallback.setAttribute('data-fallback', '1');
                    fallback.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f5f5f5;color:#999;font-size:11px;text-align:center;';
                    fallback.textContent = 'Image not available';
                    parent.appendChild(fallback);
                  }
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, textAlign: 'center', padding: '2px 4px' }}>
                {img.label}
              </span>
            </div>
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
