import { useEffect, useState } from 'react';
import api from '../api';

interface Coupon {
  id: number;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minFare: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  applicableVehicleTypes: string;
  createdAt: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState<boolean | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'PERCENTAGE', discountValue: '',
    minFare: '', maxDiscount: '', usageLimit: '', perUserLimit: '1',
    validFrom: '', validUntil: '', isActive: true, applicableVehicleTypes: '',
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: 0, size: 100 };
      if (activeOnly !== undefined) params.activeOnly = activeOnly;
      const res = await api.get('/coupons', { params });
      setCoupons(res.data.content || res.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, [activeOnly]);

  const openCreate = () => {
    setEditCoupon(null);
    setForm({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', minFare: '', maxDiscount: '', usageLimit: '', perUserLimit: '1', validFrom: '', validUntil: '', isActive: true, applicableVehicleTypes: '' });
    setShowCreate(true);
  };

  const openEdit = (c: Coupon) => {
    setEditCoupon(c);
    setForm({
      code: c.code, description: c.description, discountType: c.discountType,
      discountValue: String(c.discountValue), minFare: String(c.minFare),
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      perUserLimit: String(c.perUserLimit),
      validFrom: c.validFrom ? c.validFrom.slice(0, 16) : '',
      validUntil: c.validUntil ? c.validUntil.slice(0, 16) : '',
      isActive: c.isActive, applicableVehicleTypes: c.applicableVehicleTypes || '',
    });
    setShowCreate(true);
  };

  const handleSubmit = async () => {
    if (!confirm(editCoupon ? `Update coupon "${form.code.toUpperCase()}"?` : `Create new coupon "${form.code.toUpperCase()}"?`)) return;
    const payload = {
      ...form,
      code: form.code.toUpperCase(),
      discountValue: Number(form.discountValue),
      minFare: Number(form.minFare) || 0,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      perUserLimit: Number(form.perUserLimit) || 1,
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : new Date().toISOString(),
      validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : new Date().toISOString(),
    };

    try {
      if (editCoupon) {
        await api.put(`/coupons/${editCoupon.id}`, payload);
      } else {
        await api.post('/coupons', payload);
      }
      setShowCreate(false);
      fetchCoupons();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save coupon');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this coupon?')) return;
    try { await api.delete(`/coupons/${id}`); fetchCoupons(); } catch { alert('Failed to delete'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>Coupon Management</h1>
        <button onClick={openCreate}
          style={{ padding: '8px 16px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          + Create Coupon
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={activeOnly === undefined ? '' : String(activeOnly)}
          onChange={(e) => setActiveOnly(e.target.value === '' ? undefined : e.target.value === 'true')}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
          <option value="">All</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {loading ? <p>Loading...</p> : coupons.length === 0 ? (
        <p style={{ color: '#757575' }}>No coupons found</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Discount</th>
              <th style={thStyle}>Min Fare</th>
              <th style={thStyle}>Usage</th>
              <th style={thStyle}>Valid Until</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ ...tdStyle, fontWeight: 700, color: '#1E88E5' }}>{c.code}</td>
                <td style={tdStyle}>{c.description}</td>
                <td style={tdStyle}>{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                <td style={tdStyle}>₹{c.minFare}</td>
                <td style={tdStyle}>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                <td style={{ ...tdStyle, color: '#757575' }}>{new Date(c.validUntil).toLocaleDateString('en-IN')}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: c.isActive ? '#4CAF50' : '#9E9E9E' }}>
                    {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => openEdit(c)} style={{ marginRight: 8, padding: '4px 10px', background: '#FFC107', color: '#333', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                  <button onClick={() => handleDelete(c.id)} style={{ padding: '4px 10px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 560 }}>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>{editCoupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
              <Field label="Discount Type" value={form.discountType} onChange={(v) => setForm({ ...form, discountType: v })} type="select" options={['PERCENTAGE', 'FIXED']} />
              <Field label="Discount Value" value={form.discountValue} onChange={(v) => setForm({ ...form, discountValue: v })} type="number" />
              <Field label="Min Fare" value={form.minFare} onChange={(v) => setForm({ ...form, minFare: v })} type="number" />
              <Field label="Max Discount" value={form.maxDiscount} onChange={(v) => setForm({ ...form, maxDiscount: v })} type="number" />
              <Field label="Usage Limit" value={form.usageLimit} onChange={(v) => setForm({ ...form, usageLimit: v })} type="number" />
              <Field label="Per User Limit" value={form.perUserLimit} onChange={(v) => setForm({ ...form, perUserLimit: v })} type="number" />
              <Field label="Applicable Vehicles" value={form.applicableVehicleTypes} onChange={(v) => setForm({ ...form, applicableVehicleTypes: v })} placeholder="e.g. CAR,AUTO" />
            </div>
            <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} full />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <Field label="Valid From" value={form.validFrom} onChange={(v) => setForm({ ...form, validFrom: v })} type="datetime-local" />
              <Field label="Valid Until" value={form.validUntil} onChange={(v) => setForm({ ...form, validUntil: v })} type="datetime-local" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={handleSubmit}
                style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                {editCoupon ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setShowCreate(false)}
                style={{ padding: '8px 16px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', full, options }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; full?: boolean; options?: string[];
}) {
  return (
    <label style={{ display: 'block', marginBottom: full ? 12 : 0 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      {type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, marginTop: 4, fontSize: 13 }}>
          {options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ display: 'block', width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, marginTop: 4, fontSize: 13 }} />
      )}
    </label>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxHeight: '85vh', overflow: 'auto' };
