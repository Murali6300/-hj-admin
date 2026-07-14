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

interface DriversPageData {
  drivers: DriverListResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
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

interface EarningsSummary {
  totalNetEarnings: number;
  totalPlatformCommission: number;
  totalRides: number;
  todayEarnings: number;
  todayRides: number;
  weekEarnings: number;
  weekRides: number;
  monthEarnings: number;
  monthRides: number;
}

interface RideSummary {
  id: number;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  actualFare: number;
  actualDistanceKm: number;
  completedAt: string;
}

interface RatingSummary {
  id: number;
  rideId: number;
  raterId: number;
  score: number;
  comment: string;
  createdAt: string;
}

interface DriverDetailResponse {
  driverInfo: DriverListResponse;
  documents: DocumentSummary | null;
  earnings: EarningsSummary;
  recentRides: RideSummary[];
  ratingsReceived: RatingSummary[];
  wallet: { walletId: number; balance: number; currency: string } | null;
}

type DetailTab = 'overview' | 'documents' | 'earnings' | 'rides' | 'ratings';

// ─── Component ───────────────────────────────────────────────────────────────

export default function DriversPage() {
  const [data, setData] = useState<DriversPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Detail modal
  const [detail, setDetail] = useState<DriverDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  // Edit modal
  const [editDriver, setEditDriver] = useState<DriverListResponse | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phoneNumber: '', vehicleBrand: '', vehicleModel: '', vehicleColor: '' });
  const [editSaving, setEditSaving] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: pageSize, sort: sortBy };
      if (search.trim()) params.search = search.trim();
      if (filterStatus !== 'ALL') params.status = filterStatus;
      const res = await api.get('/drivers', { params });
      setData(res.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, search, filterStatus, sortBy]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleSearch = () => { setPage(0); setSearch(searchInput); };

  const handleViewDetail = async (driverId: number) => {
    setDetailLoading(true);
    setDetailTab('overview');
    try {
      const res = await api.get(`/drivers/${driverId}`);
      setDetail(res.data);
    } catch { /* ignore */ } finally { setDetailLoading(false); }
  };

  const handleSuspend = async (id: number) => {
    if (!confirm('Suspend this driver?')) return;
    await api.put(`/drivers/${id}/account-status`, { status: 'SUSPENDED' });
    fetchDrivers();
  };

  const handleActivate = async (id: number) => {
    await api.put(`/drivers/${id}/account-status`, { status: 'ACTIVE' });
    fetchDrivers();
  };

  const handleEdit = (driver: DriverListResponse) => {
    setEditDriver(driver);
    setEditForm({
      name: driver.name,
      phoneNumber: driver.phoneNumber,
      vehicleBrand: driver.vehicleBrand || '',
      vehicleModel: driver.vehicleModel || '',
      vehicleColor: '',
    });
  };

  const handleEditSave = async () => {
    if (!editDriver) return;
    setEditSaving(true);
    try {
      await api.put(`/drivers/${editDriver.id}`, editForm);
      setEditDriver(null);
      fetchDrivers();
      if (detail?.driverInfo.id === editDriver.id) handleViewDetail(editDriver.id);
    } catch (err: unknown) {
      alert((err as any)?.response?.data?.message || 'Update failed');
    } finally { setEditSaving(false); }
  };

  const handleExportCsv = () => {
    if (!data?.drivers?.length) return;
    const headers = ['ID', 'Name', 'Phone', 'Vehicle', 'Number', 'Online', 'Account', 'Verification', 'Rating', 'Earnings', 'Rides', 'Registered'];
    const rows = data.drivers.map(d => [
      d.id, d.name, d.phoneNumber, d.vehicleType, d.vehicleNumber,
      d.availabilityStatus, d.accountStatus, d.documentVerificationStatus || '—',
      d.averageRating.toFixed(1), d.totalEarnings.toFixed(0), d.totalRides,
      new Date(d.createdAt).toLocaleDateString('en-IN')
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `drivers_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const drivers = data?.drivers || [];
  const totalPages = data?.totalPages || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Driver Management</h1>
        <span style={{ fontSize: 13, color: '#757575' }}>{data?.totalElements || 0} drivers</span>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search name, email, phone, vehicle..." value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={inputStyle} />
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }} style={inputStyle}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="DOCUMENTS_UNDER_REVIEW">Documents Under Review</option>
          <option value="REJECTED">Rejected</option>
          <option value="LOCKED">Locked</option>
        </select>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(0); }} style={inputStyle}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A-Z</option>
        </select>
        <button onClick={handleSearch} style={btnPrimary}>Search</button>
        <button onClick={handleExportCsv} style={{ ...btnPrimary, background: '#4CAF50', marginLeft: 'auto' }}>Export CSV</button>
      </div>

      {/* Table */}
      {loading ? <p>Loading drivers...</p> : drivers.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#757575' }}>No drivers found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              {['ID', 'Name', 'Vehicle', 'Number', 'Online', 'Account', 'Verification', 'Rating', 'Earnings', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={tdStyle}>{d.id}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: getVehicleColor(d.vehicleType), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {getVehicleIcon(d.vehicleType)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{d.phoneNumber}</div>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>{d.vehicleType}</td>
                <td style={tdStyle}>{d.vehicleNumber}</td>
                <td style={tdStyle}>{getStatusBadge(d.availabilityStatus === 'AVAILABLE' ? 'ONLINE' : 'OFFLINE')}</td>
                <td style={tdStyle}>{getStatusBadge(d.accountStatus)}</td>
                <td style={tdStyle}>{getStatusBadge(d.documentVerificationStatus || 'PENDING')}</td>
                <td style={tdStyle}>
                  {d.ratingCount > 0 ? <span>⭐ {d.averageRating.toFixed(1)} <span style={{ color: '#999', fontSize: 11 }}>({d.ratingCount})</span></span> : <span style={{ color: '#999' }}>—</span>}
                </td>
                <td style={tdStyle}>₹{d.totalEarnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => handleViewDetail(d.id)} style={btnSmall('#1A73E8')} disabled={detailLoading}>View</button>
                    <button onClick={() => handleEdit(d)} style={btnSmall('#FF9800')}>Edit</button>
                    {d.accountStatus === 'ACTIVE' ? (
                      <button onClick={() => handleSuspend(d.id)} style={btnSmall('#F44336')}>Suspend</button>
                    ) : (
                      <button onClick={() => handleActivate(d.id)} style={btnSmall('#4CAF50')}>Activate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={pageBtnStyle(page === 0)}>← Previous</button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: '#555' }}>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={pageBtnStyle(page >= totalPages - 1)}>Next →</button>
        </div>
      )}

      {/* Detail Modal */}
      {(detail || detailLoading) && (
        <div style={modalOverlay} onClick={() => setDetail(null)}>
          <div style={{ ...modalContent, maxWidth: 850 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Driver Details</h2>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            {detailLoading ? <p>Loading...</p> : detail && (
              <>
                {/* Driver Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: getVehicleColor(detail.driverInfo.vehicleType), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                    {getVehicleIcon(detail.driverInfo.vehicleType)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{detail.driverInfo.name}</p>
                    <p style={{ fontSize: 13, color: '#757575', margin: '4px 0 0' }}>
                      {detail.driverInfo.vehicleBrand} {detail.driverInfo.vehicleModel} • {detail.driverInfo.vehicleNumber}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {getStatusBadge(detail.driverInfo.accountStatus)}
                    <div style={{ marginTop: 4 }}>{getStatusBadge(detail.driverInfo.availabilityStatus === 'AVAILABLE' ? 'ONLINE' : 'OFFLINE')}</div>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E0E0E0', marginBottom: 16 }}>
                  {(['overview', 'documents', 'earnings', 'rides', 'ratings'] as DetailTab[]).map(tab => (
                    <button key={tab} onClick={() => setDetailTab(tab)}
                      style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: detailTab === tab ? 600 : 400, color: detailTab === tab ? '#1A73E8' : '#757575', borderBottom: detailTab === tab ? '2px solid #1A73E8' : '2px solid transparent', marginBottom: -2 }}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
                  {detailTab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <InfoItem label="Phone" value={detail.driverInfo.phoneNumber} />
                      <InfoItem label="Email" value={detail.driverInfo.email} />
                      <InfoItem label="Vehicle" value={`${detail.driverInfo.vehicleType} • ${detail.driverInfo.vehicleNumber}`} />
                      <InfoItem label="Rating" value={detail.driverInfo.ratingCount > 0 ? `⭐ ${detail.driverInfo.averageRating.toFixed(1)} (${detail.driverInfo.ratingCount})` : 'No ratings'} />
                      <InfoItem label="Total Rides" value={String(detail.driverInfo.totalRides)} />
                      <InfoItem label="Total Earnings" value={`₹${detail.driverInfo.totalEarnings.toLocaleString('en-IN')}`} />
                      {detail.wallet && <InfoItem label="Wallet Balance" value={`₹${detail.wallet.balance.toLocaleString('en-IN')}`} />}
                      <InfoItem label="Registered" value={new Date(detail.driverInfo.createdAt).toLocaleDateString('en-IN')} />
                    </div>
                  )}

                  {detailTab === 'documents' && (
                    !detail.documents ? <p style={{ color: '#999', padding: 20 }}>No documents uploaded.</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <DocSection title="Driving License" items={[
                          { label: 'DL Number', value: detail.documents.dlNumber },
                          { label: 'Expiry', value: detail.documents.dlExpiry },
                          { label: 'Front', value: detail.documents.dlFrontUrl, isLink: true },
                          { label: 'Back', value: detail.documents.dlBackUrl, isLink: true },
                        ]} />
                        <DocSection title="RC" items={[
                          { label: 'RC Number', value: detail.documents.rcNumber },
                          { label: 'Front', value: detail.documents.rcFrontUrl, isLink: true },
                          { label: 'Back', value: detail.documents.rcBackUrl, isLink: true },
                        ]} />
                        <DocSection title="Aadhaar" items={[
                          { label: 'Number', value: detail.documents.aadhaarNumber },
                          { label: 'Front', value: detail.documents.aadhaarFrontUrl, isLink: true },
                          { label: 'Back', value: detail.documents.aadhaarBackUrl, isLink: true },
                        ]} />
                        <DocSection title="PAN" items={[
                          { label: 'Number', value: detail.documents.panNumber },
                          { label: 'Image', value: detail.documents.panUrl, isLink: true },
                        ]} />
                        <DocSection title="Insurance" items={[
                          { label: 'Provider', value: detail.documents.insuranceProvider },
                          { label: 'Policy #', value: detail.documents.insurancePolicyNumber },
                          { label: 'Expiry', value: detail.documents.insuranceExpiry },
                          { label: 'Image', value: detail.documents.insuranceImageUrl, isLink: true },
                        ]} />
                        <DocSection title="Selfie" items={[
                          { label: 'Photo', value: detail.documents.selfieUrl, isLink: true },
                        ]} />
                        <DocSection title="Emergency Contact" items={[
                          { label: 'Name', value: detail.documents.emergencyContactName },
                          { label: 'Phone', value: detail.documents.emergencyContactPhone },
                          { label: 'Relationship', value: detail.documents.emergencyContactRelationship },
                        ]} />
                        <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>Verification: {getStatusBadge(detail.documents.verificationStatus || 'PENDING')}</p>
                          {detail.documents.remarks && <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Remarks: {detail.documents.remarks}</p>}
                        </div>
                      </div>
                    )
                  )}

                  {detailTab === 'earnings' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                        <InfoItem label="Total Earnings" value={`₹${detail.earnings.totalNetEarnings.toLocaleString('en-IN')}`} color="#4CAF50" />
                        <InfoItem label="Platform Commission" value={`₹${detail.earnings.totalPlatformCommission.toLocaleString('en-IN')}`} color="#F44336" />
                        <InfoItem label="Total Rides" value={String(detail.earnings.totalRides)} />
                        <InfoItem label="Today" value={`₹${detail.earnings.todayEarnings.toFixed(0)} (${detail.earnings.todayRides} rides)`} />
                        <InfoItem label="This Week" value={`₹${detail.earnings.weekEarnings.toFixed(0)} (${detail.earnings.weekRides} rides)`} />
                        <InfoItem label="This Month" value={`₹${detail.earnings.monthEarnings.toFixed(0)} (${detail.earnings.monthRides} rides)`} />
                      </div>
                    </>
                  )}

                  {detailTab === 'rides' && (
                    detail.recentRides.length === 0 ? <p style={{ color: '#999', padding: 20 }}>No rides yet.</p> :
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={thStyle}>ID</th><th style={thStyle}>From</th><th style={thStyle}>To</th><th style={thStyle}>Status</th><th style={thStyle}>Fare</th><th style={thStyle}>Distance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.recentRides.map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                            <td style={tdStyle}>{r.id}</td>
                            <td style={tdStyle}>{r.pickupAddress || '—'}</td>
                            <td style={tdStyle}>{r.dropoffAddress || '—'}</td>
                            <td style={tdStyle}>{getStatusBadge(r.status)}</td>
                            <td style={tdStyle}>₹{r.actualFare?.toFixed(0) || '—'}</td>
                            <td style={tdStyle}>{r.actualDistanceKm ? `${r.actualDistanceKm.toFixed(1)} km` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {detailTab === 'ratings' && (
                    detail.ratingsReceived.length === 0 ? <p style={{ color: '#999', padding: 20 }}>No ratings received.</p> :
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {detail.ratingsReceived.map(r => (
                        <div key={r.id} style={{ padding: 12, background: '#f9f9f9', borderRadius: 6, border: '1px solid #E0E0E0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{'⭐'.repeat(r.score)} ({r.score}/5)</span>
                            <span style={{ fontSize: 11, color: '#999' }}>Ride #{r.rideId}</span>
                          </div>
                          {r.comment && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Detail Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid #E0E0E0', paddingTop: 16 }}>
                  <button onClick={() => { setDetail(null); handleEdit(detail.driverInfo); }} style={btnSmall('#FF9800')}>Edit Driver</button>
                  {detail.driverInfo.accountStatus === 'ACTIVE' ? (
                    <button onClick={() => { handleSuspend(detail.driverInfo.id); setDetail(null); }} style={btnSmall('#F44336')}>Suspend</button>
                  ) : (
                    <button onClick={() => { handleActivate(detail.driverInfo.id); setDetail(null); }} style={btnSmall('#4CAF50')}>Activate</button>
                  )}
                  <button onClick={() => setDetail(null)} style={{ marginLeft: 'auto', ...btnSmall('#9E9E9E') }}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editDriver && (
        <div style={modalOverlay} onClick={() => setEditDriver(null)}>
          <div style={{ ...modalContent, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Edit Driver</h2>
              <button onClick={() => setEditDriver(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Name</label><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyleModal} /></div>
              <div><label style={labelStyle}>Phone</label><input value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} style={inputStyleModal} /></div>
              <div><label style={labelStyle}>Vehicle Brand</label><input value={editForm.vehicleBrand} onChange={(e) => setEditForm({ ...editForm, vehicleBrand: e.target.value })} style={inputStyleModal} /></div>
              <div><label style={labelStyle}>Vehicle Model</label><input value={editForm.vehicleModel} onChange={(e) => setEditForm({ ...editForm, vehicleModel: e.target.value })} style={inputStyleModal} /></div>
              <div><label style={labelStyle}>Vehicle Color</label><input value={editForm.vehicleColor} onChange={(e) => setEditForm({ ...editForm, vehicleColor: e.target.value })} style={inputStyleModal} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={handleEditSave} disabled={editSaving} style={{ ...btnPrimary, flex: 1 }}>{editSaving ? 'Saving...' : 'Save Changes'}</button>
              <button onClick={() => setEditDriver(null)} style={{ ...btnSmall('#9E9E9E'), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DocSection({ title, items }: { title: string; items: { label: string; value: string; isLink?: boolean }[] }) {
  return (
    <div style={{ padding: 12, background: '#f9f9f9', borderRadius: 6, border: '1px solid #E0E0E0' }}>
      <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#1A73E8' }}>{title}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {items.filter(i => i.value).map(i => (
          <div key={i.label}>
            <span style={{ fontSize: 11, color: '#999' }}>{i.label}: </span>
            {i.isLink ? (
              <a href={i.value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1A73E8' }}>View</a>
            ) : (
              <span style={{ fontSize: 12 }}>{i.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #E0E0E0' }}>
      <p style={{ fontSize: 11, color: '#757575', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 0', color: color || '#333' }}>{value}</p>
    </div>
  );
}

function getStatusBadge(status: string) {
  const c: Record<string, { bg: string; fg: string }> = {
    ACTIVE: { bg: '#E8F5E9', fg: '#2E7D32' }, ONLINE: { bg: '#E8F5E9', fg: '#2E7D32' },
    SUSPENDED: { bg: '#FFEBEE', fg: '#C62828' }, OFFLINE: { bg: '#F5F5F5', fg: '#757575' },
    PENDING: { bg: '#FFF3E0', fg: '#E65100' }, PENDING_VERIFICATION: { bg: '#E3F2FD', fg: '#1565C0' },
    DOCUMENTS_UNDER_REVIEW: { bg: '#FFF3E0', fg: '#E65100' }, APPROVED: { bg: '#E8F5E9', fg: '#2E7D32' },
    REJECTED: { bg: '#FFEBEE', fg: '#C62828' }, LOCKED: { bg: '#FFF3E0', fg: '#E65100' },
  };
  const colors = c[status] || { bg: '#F5F5F5', fg: '#333' };
  return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: colors.bg, color: colors.fg }}>{status}</span>;
}

const thStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 12, fontWeight: 600, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', fontSize: 12 };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, minWidth: 160 };
const inputStyleModal: React.CSSProperties = { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, width: '100%', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block' };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 };
const btnSmall = (bg: string): React.CSSProperties => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' });
const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({ padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6, background: disabled ? '#f5f5f5' : '#fff', color: disabled ? '#bbb' : '#333', cursor: disabled ? 'default' : 'pointer', fontSize: 13 });
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '95%', maxHeight: '90vh', overflow: 'auto' };
