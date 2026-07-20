import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api';
import { resolveImageUrl } from '../utils/resolveImageUrl';

interface CompanyPayment {
  id: number;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  merchantName: string;
  qrType: 'STATIC' | 'DYNAMIC';
  qrImageUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: number | null;
  activatedBy: number | null;
  activatedOn: string | null;
  lastUpdatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
  merchantName: '',
  qrType: 'STATIC' as 'STATIC' | 'DYNAMIC',
  qrImageUrl: '',
};

export default function CompanyPaymentPage() {
  const [profiles, setProfiles] = useState<CompanyPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState('');
  const [removeQr, setRemoveQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; profileId: number; profileName: string; action: 'activate' }>({
    show: false, profileId: 0, profileName: '', action: 'activate',
  });

  const [viewProfile, setViewProfile] = useState<CompanyPayment | null>(null);

  const hasActiveProfile = profiles.some(p => p.status === 'ACTIVE');

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      if (qrPreview.startsWith('blob:')) URL.revokeObjectURL(qrPreview);
    };
  }, [qrPreview]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/company-payment/all');
      setProfiles(res.data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to load payment profiles';
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (qrPreview.startsWith('blob:')) URL.revokeObjectURL(qrPreview);
    setQrFile(file);
    setQrPreview(URL.createObjectURL(file));
    setRemoveQr(false);
  };

  const handleRemoveQr = () => {
    if (qrPreview.startsWith('blob:')) URL.revokeObjectURL(qrPreview);
    setQrFile(null);
    setQrPreview('');
    setRemoveQr(true);
    setForm(prev => ({ ...prev, qrImageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetFormState = useCallback(() => {
    if (qrPreview.startsWith('blob:')) URL.revokeObjectURL(qrPreview);
    setEditingId(null);
    setForm(emptyForm);
    setQrFile(null);
    setQrPreview('');
    setRemoveQr(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [qrPreview]);

  const openCreateForm = () => {
    resetFormState();
    setShowForm(true);
  };

  const openEditForm = (profile: CompanyPayment) => {
    if (qrPreview.startsWith('blob:')) URL.revokeObjectURL(qrPreview);
    setEditingId(profile.id);
    setForm({
      bankName: profile.bankName,
      accountHolder: profile.accountHolder,
      accountNumber: profile.accountNumber,
      ifscCode: profile.ifscCode,
      upiId: profile.upiId,
      merchantName: profile.merchantName,
      qrType: profile.qrType,
      qrImageUrl: profile.qrImageUrl || '',
    });
    setQrFile(null);
    setQrPreview(profile.qrImageUrl ? resolveImageUrl(profile.qrImageUrl) : '');
    setRemoveQr(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowForm(true);
  };

  const closeForm = () => {
    resetFormState();
    setShowForm(false);
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      if (editingId) {
        const payload = { ...form };
        if (removeQr) payload.qrImageUrl = '';
        await api.put(`/company-payment/${editingId}`, payload);

        if (qrFile) {
          const fd = new FormData();
          fd.append('file', qrFile);
          try {
            const qrRes = await api.post(`/company-payment/${editingId}/qr`, fd, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (qrRes.data?.qrImageUrl) {
              setForm(prev => ({ ...prev, qrImageUrl: qrRes.data.qrImageUrl }));
              setQrPreview(resolveImageUrl(qrRes.data.qrImageUrl));
            }
          } catch {
            setError('Profile updated but QR image upload failed');
          }
        } else if (removeQr) {
          setForm(prev => ({ ...prev, qrImageUrl: '' }));
          setQrPreview('');
        }
        setSuccess('Payment profile updated successfully');
      } else {
        const payload = { ...form };
        if (qrFile) payload.qrImageUrl = '';
        const res = await api.post('/company-payment', payload);

        if (qrFile && res.data?.id) {
          const fd = new FormData();
          fd.append('file', qrFile);
          try {
            await api.post(`/company-payment/${res.data.id}/qr`, fd, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } catch {
            setError('Profile created but QR image upload failed');
          }
        }
        setSuccess('Payment profile created successfully');
      }
      closeForm();
      fetchProfiles();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to save';
      setError(msg);
    } finally { setSaving(false); }
  };

  const handleActivate = async () => {
    const { profileId } = confirmDialog;
    setSaving(true);
    try {
      await api.put(`/company-payment/${profileId}/activate`);
      setSuccess('Profile activated. Previous active profile has been deactivated.');
      setConfirmDialog({ show: false, profileId: 0, profileName: '', action: 'activate' });
      fetchProfiles();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to activate profile');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Deactivate this payment profile? Users will not be able to pay via UPI until a new profile is activated.')) return;
    setSaving(true);
    try {
      await api.put(`/company-payment/${id}/deactivate`);
      setSuccess('Profile deactivated');
      fetchProfiles();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to deactivate profile');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this payment profile? This cannot be undone.')) return;
    setSaving(true);
    try {
      await api.delete(`/company-payment/${id}`);
      setSuccess('Profile deleted');
      fetchProfiles();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete profile');
    } finally { setSaving(false); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const showQrPreview = qrPreview || (form.qrImageUrl ? resolveImageUrl(form.qrImageUrl) : '');

  if (loading) return <p style={{ color: '#666' }}>Loading payment profiles...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 0 }}>Company Payment Settings</h1>
        <button onClick={openCreateForm}
          style={{ padding: '10px 20px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          + New Profile
        </button>
      </div>

      {error && <p style={{ color: '#F44336', marginBottom: 12, padding: '10px 14px', background: '#FFEBEE', borderRadius: 6 }}>{error}</p>}
      {success && <p style={{ color: '#2E7D32', marginBottom: 12, padding: '10px 14px', background: '#E8F5E9', borderRadius: 6 }}>{success}</p>}

      {!hasActiveProfile && profiles.length > 0 && (
        <div style={{ padding: '14px 18px', background: '#FFF3E0', border: '1px solid #FF9800', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong style={{ color: '#E65100' }}>No active payment profile.</strong>
            <span style={{ color: '#BF360C', marginLeft: 6 }}>Users cannot pay via UPI until you activate a payment profile.</span>
          </div>
        </div>
      )}

      {!hasActiveProfile && profiles.length === 0 && (
        <div style={{ padding: '14px 18px', background: '#FFF3E0', border: '1px solid #FF9800', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong style={{ color: '#E65100' }}>No payment profiles configured.</strong>
            <span style={{ color: '#BF360C', marginLeft: 6 }}>Create a payment profile and activate it so users can pay via UPI.</span>
          </div>
        </div>
      )}

      {profiles.length === 0 && !loading ? (
        <div style={{ background: '#fff', borderRadius: 8, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 16 }}>No payment profiles found.</p>
          <button onClick={openCreateForm}
            style={{ padding: '10px 24px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Create First Profile
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #E0E0E0' }}>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Bank Name</th>
                <th style={thStyle}>Account Holder</th>
                <th style={thStyle}>UPI ID</th>
                <th style={thStyle}>QR Type</th>
                <th style={thStyle}>QR Image</th>
                <th style={thStyle}>Last Updated</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} style={{
                  borderBottom: '1px solid #EEEEEE',
                  background: p.status === 'ACTIVE' ? '#E8F5E9' : '#fff',
                }}>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      color: '#fff', background: p.status === 'ACTIVE' ? '#4CAF50' : '#9E9E9E',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={tdStyle}>{p.bankName}</td>
                  <td style={tdStyle}>{p.accountHolder}</td>
                  <td style={tdStyle}><strong>{p.upiId}</strong></td>
                  <td style={tdStyle}>{p.qrType}</td>
                  <td style={tdStyle}>
                    {p.qrImageUrl ? (
                      <img
                        src={resolveImageUrl(p.qrImageUrl)}
                        alt="QR"
                        style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, border: '1px solid #eee' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span style={{ color: '#9E9E9E' }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>{formatDate(p.updatedAt)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setViewProfile(p)} style={actionBtnStyle('#666')} title="View">👁</button>
                    <button onClick={() => openEditForm(p)} style={actionBtnStyle('#1E88E5')} title="Edit">✏️</button>
                    {p.status === 'ACTIVE' ? (
                      <button onClick={() => handleDeactivate(p.id)} style={actionBtnStyle('#F44336')} title="Deactivate">🔴</button>
                    ) : (
                      <button onClick={() => setConfirmDialog({ show: true, profileId: p.id, profileName: p.upiId, action: 'activate' })} style={actionBtnStyle('#4CAF50')} title="Activate">🟢</button>
                    )}
                    <button onClick={() => handleDelete(p.id)} style={actionBtnStyle('#F44336')} title="Delete">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{editingId ? 'Edit Payment Profile' : 'New Payment Profile'}</h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            <div style={gridStyle}>
              <div style={fieldGroup}>
                <label style={labelStyle}>Bank Name *</label>
                <input name="bankName" value={form.bankName} onChange={handleChange}
                  placeholder="e.g. State Bank of India" style={inputStyle} />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Account Holder *</label>
                <input name="accountHolder" value={form.accountHolder} onChange={handleChange}
                  placeholder="e.g. HJ Ride Private Limited" style={inputStyle} />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Account Number *</label>
                <input name="accountNumber" value={form.accountNumber} onChange={handleChange}
                  placeholder="e.g. 1234567890" style={inputStyle} />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>IFSC Code *</label>
                <input name="ifscCode" value={form.ifscCode} onChange={handleChange}
                  placeholder="e.g. SBIN0001234" style={inputStyle} />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>UPI ID *</label>
                <input name="upiId" value={form.upiId} onChange={handleChange}
                  placeholder="e.g. hjride@upi" style={inputStyle} />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Merchant Name *</label>
                <input name="merchantName" value={form.merchantName} onChange={handleChange}
                  placeholder="e.g. HJ Ride" style={inputStyle} />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>QR Type</label>
                <select name="qrType" value={form.qrType} onChange={handleChange} style={inputStyle}>
                  <option value="STATIC">Static</option>
                  <option value="DYNAMIC">Dynamic</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>QR Image</label>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 6 }}>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleQrChange} style={{ fontSize: 13 }} />
                  {showQrPreview && (
                    <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                      <img src={showQrPreview} alt="QR Preview"
                        style={{ width: 120, height: 120, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 8, padding: 4 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button onClick={handleRemoveQr}
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#F44336', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Remove QR image">✕</button>
                    </div>
                  )}
                </div>
                {!showQrPreview && (
                  <span style={{ fontSize: 13, color: '#999', paddingTop: 8 }}>No image uploaded</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={closeForm} style={{ padding: '10px 20px', background: '#F5F5F5', color: '#333', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '10px 24px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editingId ? 'Update Profile' : 'Create Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewProfile && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Payment Profile Details</h2>
              <button onClick={() => setViewProfile(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            <div style={{ background: '#F5F5F5', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <span style={{
                display: 'inline-block', padding: '4px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                color: '#fff', background: viewProfile.status === 'ACTIVE' ? '#4CAF50' : '#9E9E9E',
              }}>
                {viewProfile.status}
              </span>
              {viewProfile.status === 'ACTIVE' && viewProfile.activatedOn && (
                <span style={{ marginLeft: 12, fontSize: 13, color: '#666' }}>
                  Activated on {formatDate(viewProfile.activatedOn)}
                </span>
              )}
            </div>

            <div style={gridStyle}>
              {[
                ['UPI ID', viewProfile.upiId],
                ['Merchant Name', viewProfile.merchantName],
                ['Bank Name', viewProfile.bankName],
                ['Account Holder', viewProfile.accountHolder],
                ['Account Number', viewProfile.accountNumber],
                ['IFSC Code', viewProfile.ifscCode],
                ['QR Type', viewProfile.qrType],
                ['Created', formatDate(viewProfile.createdAt)],
                ['Last Updated', formatDate(viewProfile.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} style={fieldGroup}>
                  <label style={labelStyle}>{label}</label>
                  <span style={{ fontSize: 14, color: '#333' }}>{value}</span>
                </div>
              ))}
            </div>

            {viewProfile.qrImageUrl && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>QR Code</label>
                <img src={resolveImageUrl(viewProfile.qrImageUrl)} alt="QR Code"
                  style={{ width: 180, height: 180, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 8, padding: 4 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
            {!viewProfile.qrImageUrl && (
              <div style={{ marginTop: 16, textAlign: 'center', padding: 16, background: '#F5F5F5', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: '#999' }}>No QR image uploaded</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => { setViewProfile(null); openEditForm(viewProfile); }}
                style={{ padding: '10px 20px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                Edit
              </button>
              <button onClick={() => setViewProfile(null)}
                style={{ padding: '10px 20px', background: '#F5F5F5', color: '#333', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activation Confirmation Dialog */}
      {confirmDialog.show && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🟢</div>
              <h2 style={{ fontSize: 18, margin: 0 }}>Activate Payment Profile?</h2>
            </div>
            <p style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
              This will activate <strong>{confirmDialog.profileName}</strong> and automatically deactivate the current active profile.
              <br /><br />
              Only one payment profile can be active at a time.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDialog({ show: false, profileId: 0, profileName: '', action: 'activate' })}
                style={{ padding: '10px 24px', background: '#F5F5F5', color: '#333', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={handleActivate} disabled={saving}
                style={{ padding: '10px 24px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Activating...' : 'Activate Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5,
};
const tdStyle: React.CSSProperties = {
  padding: '12px 14px', verticalAlign: 'middle',
};
const actionBtnStyle = (color: string): React.CSSProperties => ({
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 6px', marginLeft: 2,
  borderRadius: 4, transition: 'background 0.15s',
});
const gridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14,
};
const fieldGroup: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
};
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14,
};
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
};
const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: 24, width: '90%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};
