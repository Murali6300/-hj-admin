import { useEffect, useState } from 'react';
import api from '../api';

interface Driver {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  vehicleType: string;
  vehicleNumber: string;
  accountStatus: string;
  documentVerificationStatus: string;
  availabilityStatus: string;
  licenseNumber?: string;
}

interface DriverDocument {
  id: number;
  driverId: number;
  dlNumber?: string;
  dlExpiry?: string;
  dlFrontUrl?: string;
  dlBackUrl?: string;
  rcNumber?: string;
  rcFrontUrl?: string;
  rcBackUrl?: string;
  aadhaarNumber?: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  selfieUrl?: string;
  verificationStatus: string;
  remarks?: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [driverDocs, setDriverDocs] = useState<DriverDocument | null>(null);
  const [reuploadReason, setReuploadReason] = useState('');

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const filteredDrivers = drivers.filter(d => {
    if (filterStatus !== 'ALL' && d.accountStatus !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.phoneNumber?.includes(q) || d.vehicleNumber?.toLowerCase().includes(q);
    }
    return true;
  });

  const viewDocuments = async (driver: Driver) => {
    setSelectedDriver(driver);
    try {
      const res = await api.get(`/drivers/${driver.id}/documents`);
      setDriverDocs(res.data);
    } catch {
      setDriverDocs(null);
    }
    setShowDocs(true);
  };

  const handleReupload = async () => {
    if (!selectedDriver) return;
    await api.put(`/drivers/${selectedDriver.id}/request-reupload`, { remarks: reuploadReason || 'Please re-upload documents' });
    alert('Re-upload requested');
    setShowDocs(false);
    fetchDrivers();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      ACTIVE: { bg: '#E8F5E9', text: '#2E7D32' },
      PENDING_VERIFICATION: { bg: '#FFF3E0', text: '#E65100' },
      DOCUMENTS_UNDER_REVIEW: { bg: '#E3F2FD', text: '#1565C0' },
      REJECTED: { bg: '#FFEBEE', text: '#C62828' },
      SUSPENDED: { bg: '#FCE4EC', text: '#880E4F' },
      APPROVED: { bg: '#E8F5E9', text: '#2E7D32' },
      PENDING: { bg: '#FFF3E0', text: '#E65100' },
    };
    const c = colors[status] || { bg: '#F5F5F5', text: '#616161' };
    return <span style={{ padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text }}>{status}</span>;
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Driver Management</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, phone, vehicle number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, minWidth: 300 }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DOCUMENTS_UNDER_REVIEW">Under Review</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {loading ? (
        <p>Loading drivers...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Number</th>
              <th style={thStyle}>Online</th>
              <th style={thStyle}>Account</th>
              <th style={thStyle}>Verification</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={tdStyle}>{d.id}</td>
                <td style={tdStyle}>{d.name}</td>
                <td style={tdStyle}>{d.phoneNumber}</td>
                <td style={tdStyle}>{d.vehicleType}</td>
                <td style={tdStyle}>{d.vehicleNumber}</td>
                <td style={tdStyle}>
                  <span style={{ color: d.availabilityStatus === 'AVAILABLE' ? '#4CAF50' : '#9E9E9E' }}>
                    {d.availabilityStatus === 'AVAILABLE' ? '● Online' : '○ Offline'}
                  </span>
                </td>
                <td style={tdStyle}>{getStatusBadge(d.accountStatus)}</td>
                <td style={tdStyle}>{getStatusBadge(d.documentVerificationStatus)}</td>
                <td style={tdStyle}>
                  <button onClick={() => viewDocuments(d)} style={{ padding: '6px 12px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
                    View Docs
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showDocs && selectedDriver && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 30, maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20 }}>KYC Documents - {selectedDriver.name}</h2>
              <button onClick={() => setShowDocs(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>X</button>
            </div>

            {driverDocs ? (
              <div style={{ fontSize: 14 }}>
                <Section title="Driving License">
                  <p><strong>DL Number:</strong> {driverDocs.dlNumber || 'Not uploaded'}</p>
                  <p><strong>Expiry:</strong> {driverDocs.dlExpiry || 'N/A'}</p>
                  {driverDocs.dlFrontUrl && <DocLink url={driverDocs.dlFrontUrl} label="DL Front" />}
                  {driverDocs.dlBackUrl && <DocLink url={driverDocs.dlBackUrl} label="DL Back" />}
                </Section>

                <Section title="Registration Certificate">
                  <p><strong>RC Number:</strong> {driverDocs.rcNumber || 'Not uploaded'}</p>
                  {driverDocs.rcFrontUrl && <DocLink url={driverDocs.rcFrontUrl} label="RC Front" />}
                  {driverDocs.rcBackUrl && <DocLink url={driverDocs.rcBackUrl} label="RC Back" />}
                </Section>

                <Section title="Aadhaar / National ID">
                  <p><strong>Aadhaar Number:</strong> {driverDocs.aadhaarNumber || 'Not uploaded'}</p>
                  {driverDocs.aadhaarFrontUrl && <DocLink url={driverDocs.aadhaarFrontUrl} label="Aadhaar Front" />}
                  {driverDocs.aadhaarBackUrl && <DocLink url={driverDocs.aadhaarBackUrl} label="Aadhaar Back" />}
                </Section>

                <Section title="Selfie">
                  {driverDocs.selfieUrl ? <DocLink url={driverDocs.selfieUrl} label="View Selfie" /> : <p>Not uploaded</p>}
                </Section>

                <div style={{ marginTop: 16 }}>
                  <strong>Verification Status: </strong>
                  {getStatusBadge(driverDocs.verificationStatus)}
                </div>

                {driverDocs.remarks && (
                  <div style={{ marginTop: 8, padding: 10, background: '#FFF3E0', borderRadius: 6 }}>
                    <strong>Remarks:</strong> {driverDocs.remarks}
                  </div>
                )}

                <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 16 }}>
                  <h4>Request Re-upload</h4>
                  <input
                    type="text"
                    placeholder="Reason for re-upload..."
                    value={reuploadReason}
                    onChange={(e) => setReuploadReason(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, marginBottom: 8 }}
                  />
                  <button onClick={handleReupload} style={{ padding: '8px 16px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    Request Re-upload
                  </button>
                </div>
              </div>
            ) : (
              <p>No documents found for this driver.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ marginBottom: 8, color: '#1A73E8' }}>{title}</h4>
      {children}
    </div>
  );
}

function DocLink({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '4px 10px', background: '#E3F2FD', color: '#1565C0', borderRadius: 4, fontSize: 12, textDecoration: 'none', marginTop: 4 }}>
      {label}
    </a>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
