import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import api from '../api';
import { getVehicleIcon, getVehicleColor } from '../utils/vehicleIcons';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VehicleTypeConfig {
  id: number;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  capacity: number;
  acAvailable: boolean;
  acSurcharge: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  displayName: string;
  description: string;
  icon: string;
  color: string;
  baseFare: string;
  perKmRate: string;
  perMinRate: string;
  capacity: string;
  acAvailable: boolean;
  acSurcharge: string;
  isActive: boolean;
}

const EMPTY_FORM: FormData = {
  displayName: '',
  description: '',
  icon: '🚗',
  color: '#1E88E5',
  baseFare: '',
  perKmRate: '',
  perMinRate: '',
  capacity: '4',
  acAvailable: false,
  acSurcharge: '0',
  isActive: true,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<'name' | 'baseFare' | 'isActive'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleTypeConfig | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<VehicleTypeConfig | null>(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/vehicle-types');
      setVehicles(res.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  // ─── Filtering + Sorting ──────────────────────────────────────────────────

  const filtered = vehicles
    .filter((v) => {
      if (statusFilter === 'active' && !v.isActive) return false;
      if (statusFilter === 'inactive' && v.isActive) return false;
      if (search && !v.displayName.toLowerCase().includes(search.toLowerCase()) &&
          !v.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.displayName.localeCompare(b.displayName);
      else if (sortField === 'baseFare') cmp = a.baseFare - b.baseFare;
      else if (sortField === 'isActive') cmp = (a.isActive ? 0 : 1) - (b.isActive ? 0 : 1);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortIndicator = (field: typeof sortField) =>
    sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  // ─── CSV Export ──────────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = 'Name,Display Name,Base Fare,Per Km,Per Min,Capacity,AC Available,Active,Description\n';
    const rows = filtered.map(v =>
      `${v.name},${v.displayName},${v.baseFare},${v.perKmRate},${v.perMinRate},${v.capacity ?? 4},${v.acAvailable ? 'Yes' : 'No'},${v.isActive ? 'Yes' : 'No'},"${(v.description || '').replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vehicle_types.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Create / Edit Modal ─────────────────────────────────────────────────

  const openCreate = () => {
    setEditingVehicle(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (v: VehicleTypeConfig) => {
    setEditingVehicle(v);
    setForm({
      displayName: v.displayName,
      description: v.description || '',
      icon: v.icon || '🚗',
      color: v.color || '#1E88E5',
      baseFare: v.baseFare.toString(),
      perKmRate: v.perKmRate.toString(),
      perMinRate: v.perMinRate.toString(),
      capacity: (v.capacity ?? 4).toString(),
      acAvailable: v.acAvailable ?? false,
      acSurcharge: (v.acSurcharge ?? 0).toString(),
      isActive: v.isActive,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) { setFormError('Display name is required'); return; }
    if (!form.baseFare || Number(form.baseFare) < 0) { setFormError('Base fare must be >= 0'); return; }
    if (!form.perKmRate || Number(form.perKmRate) < 0) { setFormError('Per km rate must be >= 0'); return; }
    if (!form.perMinRate || Number(form.perMinRate) < 0) { setFormError('Per min rate must be >= 0'); return; }
    if (!confirm(editingVehicle ? `Update vehicle type "${form.displayName}"?` : `Create new vehicle type "${form.displayName}"?`)) return;

    setActionLoading(editingVehicle?.id ?? -1);
    try {
      const payload = {
        displayName: form.displayName.trim(),
        description: form.description.trim() || null,
        icon: form.icon.trim() || null,
        color: form.color.trim() || null,
        baseFare: Number(form.baseFare),
        perKmRate: Number(form.perKmRate),
        perMinRate: Number(form.perMinRate),
        capacity: Number(form.capacity) || 4,
        acAvailable: form.acAvailable,
        acSurcharge: Number(form.acSurcharge) || 0,
        isActive: form.isActive,
      };
      if (editingVehicle) {
        await api.put(`/vehicle-types/${editingVehicle.id}`, payload);
      } else {
        await api.post('/vehicle-types', payload);
      }
      setModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save vehicle type');
    } finally { setActionLoading(null); }
  };

  // ─── Toggle Active ───────────────────────────────────────────────────────

  const handleToggleActive = async (v: VehicleTypeConfig) => {
    if (!confirm(`${v.isActive ? 'Deactivate' : 'Activate'} "${v.displayName}"? ${v.isActive ? 'Users will no longer see this vehicle type.' : 'This vehicle type will become visible to users.'}`)) return;
    setActionLoading(v.id);
    try {
      await api.put(`/vehicle-types/${v.id}`, {
        displayName: v.displayName,
        description: v.description,
        icon: v.icon,
        color: v.color,
        baseFare: v.baseFare,
        perKmRate: v.perKmRate,
        perMinRate: v.perMinRate,
        capacity: v.capacity,
        acAvailable: v.acAvailable,
        acSurcharge: v.acSurcharge,
        isActive: !v.isActive,
      });
      fetchVehicles();
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  // ─── Delete (soft) ──────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await api.delete(`/vehicle-types/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchVehicles();
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Vehicle Types</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV}
            style={{ padding: '8px 14px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            Export CSV
          </button>
          <button onClick={openCreate}
            style={{ padding: '8px 16px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Add Vehicle Type
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, width: 220 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span style={{ fontSize: 12, color: '#757575', alignSelf: 'center' }}>{filtered.length} vehicle types</span>
      </div>

      {/* Table */}
      {loading ? <p>Loading...</p> : (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F5F5F5', textAlign: 'left' }}>
                <th style={thStyle}></th>
                <th style={thStyle} onClick={() => handleSort('name')} className="sortable">
                  Name{sortIndicator('name')}
                </th>
                <th style={thStyle}>Description</th>
                <th style={thStyle} onClick={() => handleSort('baseFare')} className="sortable">
                  Base Fare{sortIndicator('baseFare')}
                </th>
                <th style={thStyle}>Per Km</th>
                <th style={thStyle}>Per Min</th>
                <th style={thStyle}>Capacity</th>
                <th style={thStyle}>AC</th>
                <th style={thStyle} onClick={() => handleSort('isActive')} className="sortable">
                  Status{sortIndicator('isActive')}
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#999' }}>No vehicle types found</td></tr>
              ) : filtered.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={tdStyle}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: v.color || getVehicleColor(v.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {v.icon || getVehicleIcon(v.name)}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{v.displayName}</span>
                      <span style={{ color: '#999', marginLeft: 6, fontSize: 11 }}>({v.name})</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: '#666', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.description || '-'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>₹{v.baseFare.toFixed(0)}</span>
                  </td>
                  <td style={tdStyle}>₹{v.perKmRate.toFixed(1)}</td>
                  <td style={tdStyle}>₹{v.perMinRate.toFixed(1)}</td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>👥 {v.capacity ?? 4}</span>
                  </td>
                  <td style={tdStyle}>
                    {v.acAvailable ? (
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>
                        ❄ AC
                      </span>
                    ) : (
                      <span style={{ color: '#999', fontSize: 11 }}>-</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: v.isActive ? '#E8F5E9' : '#FFEBEE',
                      color: v.isActive ? '#2E7D32' : '#C62828',
                    }}>
                      {v.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => openEdit(v)} style={{ padding: '4px 10px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleToggleActive(v)} disabled={actionLoading === v.id}
                        style={{ padding: '4px 10px', background: v.isActive ? '#FF9800' : '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                        {actionLoading === v.id ? '...' : v.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => setDeleteTarget(v)} style={{ padding: '4px 10px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div style={modalOverlay} onClick={() => setModalOpen(false)}>
          <div style={{ ...modalContent, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>
              {editingVehicle ? `Edit ${editingVehicle.displayName}` : 'Add Vehicle Type'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Display Name *</label>
                <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="e.g. Mini SUV" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Compact & efficient" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Icon (emoji)</label>
                  <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="🚗" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Color (hex)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                      style={{ width: 40, height: 36, border: 'none', cursor: 'pointer', padding: 0 }} />
                    <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                      placeholder="#1E88E5" style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Base Fare (₹) *</label>
                  <input type="number" min="0" step="0.5" value={form.baseFare}
                    onChange={(e) => setForm({ ...form, baseFare: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Per Km (₹) *</label>
                  <input type="number" min="0" step="0.5" value={form.perKmRate}
                    onChange={(e) => setForm({ ...form, perKmRate: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Per Min (₹) *</label>
                  <input type="number" min="0" step="0.1" value={form.perMinRate}
                    onChange={(e) => setForm({ ...form, perMinRate: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Passenger Capacity</label>
                  <input type="number" min="1" max="10" value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>AC Surcharge (₹)</label>
                  <input type="number" min="0" step="0.5" value={form.acSurcharge}
                    onChange={(e) => setForm({ ...form, acSurcharge: e.target.value })}
                    disabled={!form.acAvailable}
                    style={{ ...inputStyle, opacity: form.acAvailable ? 1 : 0.5 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.acAvailable}
                    onChange={(e) => setForm({ ...form, acAvailable: e.target.checked })}
                    id="ac-checkbox" />
                  <label htmlFor="ac-checkbox" style={{ fontSize: 13 }}>AC Available (4-wheelers)</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    id="active-checkbox" />
                  <label htmlFor="active-checkbox" style={{ fontSize: 13 }}>Active (visible to users)</label>
                </div>
              </div>
            </div>

            {formError && <p style={{ color: '#F44336', fontSize: 12, marginTop: 8 }}>{formError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={handleSave} disabled={actionLoading !== null}
                style={{ flex: 1, padding: '10px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {actionLoading !== null ? 'Saving...' : editingVehicle ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setModalOpen(false)}
                style={{ flex: 1, padding: '10px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div style={{ ...modalContent, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Deactivate Vehicle Type</h2>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
              Are you sure you want to deactivate <strong>{deleteTarget.displayName}</strong> ({deleteTarget.name})?
            </p>
            <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
              This will hide it from the user app. Existing drivers/rides using this type will not be affected. You can reactivate it later.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDelete} disabled={actionLoading === deleteTarget.id}
                style={{ flex: 1, padding: '10px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {actionLoading === deleteTarget.id ? 'Deactivating...' : 'Deactivate'}
              </button>
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const thStyle: CSSProperties = { padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#555', cursor: 'default', whiteSpace: 'nowrap' };
const tdStyle: CSSProperties = { padding: '10px 12px' };
const modalOverlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '95%', maxHeight: '90vh', overflow: 'auto' };
const labelStyle: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 };
const inputStyle: CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };
