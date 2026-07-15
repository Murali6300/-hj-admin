import { useEffect, useState, useCallback } from 'react';
import api from '../api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserListResponse {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  accountStatus: string;
  walletBalance: number;
  rideCount: number;
  averageRating: number;
  ratingCount: number;
  profileImageUrl: string | null;
  createdAt: string;
}

interface UsersPageData {
  users: UserListResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

interface RideSummary {
  id: number;
  pickupAddress: string;
  dropoffAddress: string;
  rideType: string;
  status: string;
  estimatedFare: number;
  actualFare: number;
  createdAt: string;
  completedAt: string;
}

interface WalletTxnSummary {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  status: string;
  createdAt: string;
}

interface WalletSummary {
  walletId: number;
  balance: number;
  currency: string;
  isActive: boolean;
  recentTransactions: WalletTxnSummary[];
}

interface SavedAddressSummary {
  id: number;
  label: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface PaymentSummary {
  id: number;
  rideId: number;
  totalFare: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string;
  createdAt: string;
}

interface RatingSummary {
  id: number;
  rideId: number;
  raterId: number;
  score: number;
  comment: string;
  createdAt: string;
}

interface UserDetailResponse {
  userInfo: UserListResponse;
  rideHistory: RideSummary[];
  wallet: WalletSummary | null;
  savedAddresses: SavedAddressSummary[];
  paymentHistory: PaymentSummary[];
  ratingsReceived: RatingSummary[];
}

type DetailTab = 'overview' | 'rides' | 'wallet' | 'addresses' | 'payments' | 'ratings';

// ─── Component ───────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [data, setData] = useState<UsersPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Detail modal
  const [detailUser, setDetailUser] = useState<UserDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  // Edit modal
  const [editUser, setEditUser] = useState<UserListResponse | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phoneNumber: '' });
  const [editSaving, setEditSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: pageSize, sort: sortBy };
      if (search.trim()) params.search = search.trim();
      if (filterStatus !== 'ALL') params.status = filterStatus;
      const res = await api.get('/users', { params });
      setData(res.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, search, filterStatus, sortBy]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = () => {
    setPage(0);
    setSearch(searchInput);
  };

  const handleViewDetail = async (userId: number) => {
    setDetailLoading(true);
    setDetailTab('overview');
    try {
      const res = await api.get(`/users/${userId}`);
      setDetailUser(res.data);
    } catch { /* ignore */ } finally { setDetailLoading(false); }
  };

  const handleSuspend = async (id: number) => {
    if (!confirm('Suspend this user?')) return;
    await api.put(`/users/${id}/suspend`);
    fetchUsers();
  };

  const handleActivate = async (id: number) => {
    if (!confirm('Activate this user? They will regain full access to the app.')) return;
    await api.put(`/users/${id}/activate`);
    fetchUsers();
  };

  const handleResetPassword = async (id: number) => {
    if (!confirm('Reset this user password to default (HJ@12345)?')) return;
    const res = await api.put(`/users/${id}/reset-password`);
    alert(res.data.message);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('PERMANENTLY delete this user? This cannot be undone.')) return;
    await api.delete(`/users/${id}`);
    fetchUsers();
  };

  const handleEdit = (user: UserListResponse) => {
    setEditUser(user);
    setEditForm({ name: user.name, email: user.email, phoneNumber: user.phoneNumber });
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    if (!confirm(`Save changes to "${editUser.name}"?`)) return;
    setEditSaving(true);
    try {
      await api.put(`/users/${editUser.id}`, editForm);
      setEditUser(null);
      fetchUsers();
      if (detailUser?.userInfo.id === editUser.id) {
        handleViewDetail(editUser.id);
      }
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || 'Update failed';
      alert(msg);
    } finally { setEditSaving(false); }
  };

  const handleExportCsv = () => {
    if (!data?.users?.length) return;
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Status', 'Wallet Balance', 'Rides', 'Avg Rating', 'Registered'];
    const rows = data.users.map(u => [
      u.id, u.name, u.email, u.phoneNumber, u.accountStatus,
      u.walletBalance.toFixed(2), u.rideCount, u.averageRating.toFixed(1),
      new Date(u.createdAt).toLocaleDateString('en-IN')
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const users = data?.users || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>User Management</h1>
        <span style={{ fontSize: 13, color: '#757575' }}>{totalElements} total users</span>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search name, email, phone..." value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={inputStyle} />
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
          style={inputStyle}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="LOCKED">Locked</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
          style={inputStyle}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
        </select>
        <button onClick={handleSearch} style={btnPrimary}>Search</button>
        <button onClick={handleExportCsv} style={{ ...btnPrimary, background: '#4CAF50', marginLeft: 'auto' }}>
          Export CSV
        </button>
      </div>

      {/* Table */}
      {loading ? <p>Loading users...</p> : users.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#757575' }}>No users found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              {['ID', 'Name', 'Phone', 'Email', 'Status', 'Wallet', 'Rides', 'Rating', 'Registered', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={tdStyle}>{user.id}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1A73E8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span style={{ fontWeight: 500 }}>{user.name}</span>
                  </div>
                </td>
                <td style={tdStyle}>{user.phoneNumber}</td>
                <td style={tdStyle}>{user.email}</td>
                <td style={tdStyle}>{getStatusBadge(user.accountStatus)}</td>
                <td style={tdStyle}>₹{user.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td style={tdStyle}>{user.rideCount}</td>
                <td style={tdStyle}>
                  {user.ratingCount > 0 ? (
                    <span>⭐ {user.averageRating.toFixed(1)} <span style={{ color: '#999', fontSize: 11 }}>({user.ratingCount})</span></span>
                  ) : <span style={{ color: '#999' }}>—</span>}
                </td>
                <td style={tdStyle}>{new Date(user.createdAt).toLocaleDateString('en-IN')}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => handleViewDetail(user.id)} style={btnSmall('#1A73E8')} disabled={detailLoading}>
                      View
                    </button>
                    <button onClick={() => handleEdit(user)} style={btnSmall('#FF9800')}>Edit</button>
                    {user.accountStatus === 'ACTIVE' ? (
                      <button onClick={() => handleSuspend(user.id)} style={btnSmall('#F44336')}>Suspend</button>
                    ) : (
                      <button onClick={() => handleActivate(user.id)} style={btnSmall('#4CAF50')}>Activate</button>
                    )}
                    <button onClick={() => handleResetPassword(user.id)} style={btnSmall('#9C27B0')}>Reset PW</button>
                    <button onClick={() => handleDelete(user.id)} style={btnSmall('#B71C1C')}>Delete</button>
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
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={pageBtnStyle(page === 0)}>
            ← Previous
          </button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: '#555' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={pageBtnStyle(page >= totalPages - 1)}>
            Next →
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {(detailUser || detailLoading) && (
        <div style={modalOverlay} onClick={() => setDetailUser(null)}>
          <div style={{ ...modalContent, maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>User Details</h2>
              <button onClick={() => setDetailUser(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            {detailLoading ? <p>Loading...</p> : detailUser && (
              <>
                {/* User Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1A73E8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 700 }}>
                    {detailUser.userInfo.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{detailUser.userInfo.name}</p>
                    <p style={{ fontSize: 13, color: '#757575', margin: '4px 0 0' }}>{detailUser.userInfo.email}</p>
                  </div>
                  {getStatusBadge(detailUser.userInfo.accountStatus)}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E0E0E0', marginBottom: 16 }}>
                  {(['overview', 'rides', 'wallet', 'addresses', 'payments', 'ratings'] as DetailTab[]).map(tab => (
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
                      <InfoItem label="Phone" value={detailUser.userInfo.phoneNumber} />
                      <InfoItem label="Status" value={detailUser.userInfo.accountStatus} color={detailUser.userInfo.accountStatus === 'ACTIVE' ? '#4CAF50' : '#F44336'} />
                      <InfoItem label="Wallet Balance" value={`₹${detailUser.userInfo.walletBalance.toLocaleString('en-IN')}`} />
                      <InfoItem label="Total Rides" value={String(detailUser.userInfo.rideCount)} />
                      <InfoItem label="Avg Rating" value={detailUser.userInfo.ratingCount > 0 ? `⭐ ${detailUser.userInfo.averageRating.toFixed(1)} (${detailUser.userInfo.ratingCount} ratings)` : 'No ratings'} />
                      <InfoItem label="Registered" value={new Date(detailUser.userInfo.createdAt).toLocaleDateString('en-IN')} />
                      <InfoItem label="Saved Addresses" value={String(detailUser.savedAddresses.length)} />
                      <InfoItem label="Total Payments" value={String(detailUser.paymentHistory.length)} />
                    </div>
                  )}

                  {detailTab === 'rides' && (
                    detailUser.rideHistory.length === 0 ? <p style={{ color: '#999', padding: 20 }}>No rides yet.</p> :
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={thStyle}>ID</th>
                          <th style={thStyle}>From</th>
                          <th style={thStyle}>To</th>
                          <th style={thStyle}>Type</th>
                          <th style={thStyle}>Status</th>
                          <th style={thStyle}>Fare</th>
                          <th style={thStyle}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailUser.rideHistory.map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                            <td style={tdStyle}>{r.id}</td>
                            <td style={tdStyle}>{r.pickupAddress || '—'}</td>
                            <td style={tdStyle}>{r.dropoffAddress || '—'}</td>
                            <td style={tdStyle}>{r.rideType}</td>
                            <td style={tdStyle}>{getStatusBadge(r.status)}</td>
                            <td style={tdStyle}>₹{r.actualFare?.toFixed(0) || r.estimatedFare?.toFixed(0) || '—'}</td>
                            <td style={tdStyle}>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {detailTab === 'wallet' && (
                    !detailUser.wallet ? <p style={{ color: '#999', padding: 20 }}>No wallet.</p> : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                          <InfoItem label="Balance" value={`₹${detailUser.wallet.balance.toLocaleString('en-IN')}`} />
                          <InfoItem label="Currency" value={detailUser.wallet.currency} />
                          <InfoItem label="Active" value={detailUser.wallet.isActive ? 'Yes' : 'No'} />
                        </div>
                        <h4 style={{ margin: '12px 0 8px', fontSize: 14 }}>Recent Transactions</h4>
                        {detailUser.wallet.recentTransactions.length === 0 ? <p style={{ color: '#999' }}>No transactions.</p> :
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: '#f5f5f5' }}>
                                <th style={thStyle}>Type</th><th style={thStyle}>Amount</th><th style={thStyle}>Balance After</th><th style={thStyle}>Description</th><th style={thStyle}>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailUser.wallet.recentTransactions.map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                                  <td style={tdStyle}>{t.type}</td>
                                  <td style={{ ...tdStyle, color: t.type === 'PAYMENT' || t.type === 'WITHDRAWAL' ? '#F44336' : '#4CAF50' }}>
                                    {t.type === 'PAYMENT' || t.type === 'WITHDRAWAL' ? '-' : '+'}₹{t.amount.toFixed(2)}
                                  </td>
                                  <td style={tdStyle}>₹{t.balanceAfter.toFixed(2)}</td>
                                  <td style={tdStyle}>{t.description || '—'}</td>
                                  <td style={tdStyle}>{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        }
                      </>
                    )
                  )}

                  {detailTab === 'addresses' && (
                    detailUser.savedAddresses.length === 0 ? <p style={{ color: '#999', padding: 20 }}>No saved addresses.</p> :
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {detailUser.savedAddresses.map(a => (
                        <div key={a.id} style={{ padding: 12, background: '#f9f9f9', borderRadius: 6, border: '1px solid #E0E0E0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'uppercase', color: '#1A73E8' }}>{a.label}</span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: 13 }}>{a.name} — {a.address}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#999' }}>{a.latitude.toFixed(5)}, {a.longitude.toFixed(5)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {detailTab === 'payments' && (
                    detailUser.paymentHistory.length === 0 ? <p style={{ color: '#999', padding: 20 }}>No payments.</p> :
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={thStyle}>ID</th><th style={thStyle}>Ride</th><th style={thStyle}>Amount</th><th style={thStyle}>Method</th><th style={thStyle}>Status</th><th style={thStyle}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailUser.paymentHistory.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                            <td style={tdStyle}>{p.id}</td>
                            <td style={tdStyle}>{p.rideId}</td>
                            <td style={tdStyle}>₹{p.totalFare.toFixed(2)}</td>
                            <td style={tdStyle}>{p.paymentMethod || '—'}</td>
                            <td style={tdStyle}>{getStatusBadge(p.paymentStatus)}</td>
                            <td style={tdStyle}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {detailTab === 'ratings' && (
                    detailUser.ratingsReceived.length === 0 ? <p style={{ color: '#999', padding: 20 }}>No ratings received.</p> :
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {detailUser.ratingsReceived.map(r => (
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
                  <button onClick={() => { setDetailUser(null); handleEdit(detailUser.userInfo); }} style={btnSmall('#FF9800')}>Edit User</button>
                  {detailUser.userInfo.accountStatus === 'ACTIVE' ? (
                    <button onClick={() => { handleSuspend(detailUser.userInfo.id); setDetailUser(null); }} style={btnSmall('#F44336')}>Suspend</button>
                  ) : (
                    <button onClick={() => { handleActivate(detailUser.userInfo.id); setDetailUser(null); }} style={btnSmall('#4CAF50')}>Activate</button>
                  )}
                  <button onClick={() => { handleResetPassword(detailUser.userInfo.id); }} style={btnSmall('#9C27B0')}>Reset Password</button>
                  <button onClick={() => setDetailUser(null)} style={{ marginLeft: 'auto', ...btnSmall('#9E9E9E') }}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div style={modalOverlay} onClick={() => setEditUser(null)}>
          <div style={{ ...modalContent, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Edit User</h2>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyleModal} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={inputStyleModal} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} style={inputStyleModal} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={handleEditSave} disabled={editSaving} style={{ ...btnPrimary, flex: 1 }}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditUser(null)} style={{ ...btnSmall('#9E9E9E'), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  const colors: Record<string, { bg: string; fg: string }> = {
    ACTIVE: { bg: '#E8F5E9', fg: '#2E7D32' },
    SUSPENDED: { bg: '#FFEBEE', fg: '#C62828' },
    LOCKED: { bg: '#FFF3E0', fg: '#E65100' },
    DEACTIVATED: { bg: '#F5F5F5', fg: '#757575' },
    PENDING_VERIFICATION: { bg: '#E3F2FD', fg: '#1565C0' },
    COMPLETED: { bg: '#E8F5E9', fg: '#2E7D32' },
    CANCELLED: { bg: '#FFEBEE', fg: '#C62828' },
    PENDING: { bg: '#FFF3E0', fg: '#E65100' },
    SUCCESS: { bg: '#E8F5E9', fg: '#2E7D32' },
    FAILED: { bg: '#FFEBEE', fg: '#C62828' },
  };
  const c = colors[status] || { bg: '#F5F5F5', fg: '#333' };
  return (
    <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: c.bg, color: c.fg }}>
      {status}
    </span>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

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
