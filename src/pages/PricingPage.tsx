import { useEffect, useState } from 'react';
import api from '../api';

interface ConfigItem {
  id: number;
  configKey: string;
  configValue: string;
  description: string;
  category: string;
  updatedAt: string;
}

interface PricingField {
  key: string;
  label: string;
  unit: string;
  category: string;
}

const PRICING_FIELDS: PricingField[] = [
  { key: 'base_fare', label: 'Base Fare', unit: '₹', category: 'PRICING' },
  { key: 'per_km', label: 'Per Kilometre', unit: '₹/km', category: 'PRICING' },
  { key: 'per_minute', label: 'Per Minute', unit: '₹/min', category: 'PRICING' },
  { key: 'minimum_fare', label: 'Minimum Fare', unit: '₹', category: 'PRICING' },
  { key: 'night_charge', label: 'Night Charge (10PM–5AM)', unit: '₹', category: 'PRICING' },
  { key: 'peak_charge', label: 'Peak Hour Surcharge', unit: '₹', category: 'PRICING' },
  { key: 'festival_charge', label: 'Festival Surcharge', unit: '₹', category: 'PRICING' },
  { key: 'airport_charge', label: 'Airport Surcharge', unit: '₹', category: 'PRICING' },
  { key: 'surge_multiplier_max', label: 'Max Surge Multiplier', unit: 'x', category: 'SURGE' },
  { key: 'surge_threshold', label: 'Surge Demand Threshold (%)', unit: '%', category: 'SURGE' },
  { key: 'cancellation_fee', label: 'Cancellation Fee', unit: '₹', category: 'PRICING' },
  { key: 'platform_commission', label: 'Platform Commission', unit: '%', category: 'PRICING' },
  { key: 'ac_surcharge_default', label: 'AC Surcharge (Default)', unit: '₹', category: 'PRICING' },
];

const FIELD_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'PRICING', label: 'Pricing' },
  { key: 'SURGE', label: 'Surge' },
];

export default function PricingPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [filterCat, setFilterCat] = useState('all');
  const [toast, setToast] = useState('');

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/config');
      const grouped = res.data as Record<string, ConfigItem[]>;
      const all: ConfigItem[] = Object.values(grouped).flat();
      setConfigs(all);
      const map: Record<string, string> = {};
      all.forEach((c) => { map[c.configKey] = c.configValue; });
      setValues(map);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setDirty((prev) => { const next = new Set(prev); next.add(key); return next; });
  };

  const handleSaveAll = async () => {
    if (!confirm('Save all pricing changes? These take effect immediately.')) return;
    setSaving(true);
    try {
      const payload = PRICING_FIELDS
        .filter((f) => dirty.has(f.key))
        .map((f) => ({
          configKey: f.key,
          configValue: values[f.key] || '0',
          description: f.label,
          category: f.category,
        }));
      if (payload.length === 0) { setToast('No changes to save'); setTimeout(() => setToast(''), 3000); return; }
      await api.put('/config/bulk', payload);
      setDirty(new Set());
      await fetchConfigs();
      setToast(`Saved ${payload.length} config(s) successfully`);
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setToast(err?.response?.data?.message || 'Failed to save');
      setTimeout(() => setToast(''), 4000);
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    const map: Record<string, string> = {};
    configs.forEach((c) => { map[c.configKey] = c.configValue; });
    setValues(map);
    setDirty(new Set());
  };

  const filteredFields = PRICING_FIELDS.filter((f) => filterCat === 'all' || f.category === filterCat);

  const lastUpdated = configs.reduce((latest, c) => {
    const t = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
    return t > latest ? t : latest;
  }, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Pricing & Surge Management</h1>
          {lastUpdated > 0 && (
            <p style={{ fontSize: 12, color: '#757575', margin: 0 }}>
              Last updated: {new Date(lastUpdated).toLocaleString('en-IN')}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleReset} disabled={dirty.size === 0}
            style={{ padding: '8px 16px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: dirty.size === 0 ? 'not-allowed' : 'pointer', opacity: dirty.size === 0 ? 0.5 : 1, fontSize: 13 }}>
            Reset
          </button>
          <button onClick={handleSaveAll} disabled={saving || dirty.size === 0}
            style={{ padding: '8px 16px', background: dirty.size > 0 ? '#4CAF50' : '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: saving || dirty.size === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
            {saving ? 'Saving...' : `Save Changes${dirty.size > 0 ? ` (${dirty.size})` : ''}`}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {FIELD_CATEGORIES.map((cat) => (
          <button key={cat.key} onClick={() => setFilterCat(cat.key)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #ddd', background: filterCat === cat.key ? '#1A73E8' : '#fff', color: filterCat === cat.key ? '#fff' : '#333', fontSize: 13, cursor: 'pointer', fontWeight: filterCat === cat.key ? 600 : 400 }}>
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={thStyle}>Parameter</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Value</th>
                <th style={thStyle}>Unit</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredFields.map((field) => {
                const isDirty = dirty.has(field.key);
                const currentVal = values[field.key] || '0';
                return (
                  <tr key={field.key} style={{ borderTop: '1px solid #eee', background: isDirty ? '#FFF8E1' : '#fff' }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#1A237E' }}>{field.key}</span>
                    </td>
                    <td style={tdStyle}>{field.label}</td>
                    <td style={tdStyle}>
                      <input type="number" step="0.01" min="0"
                        value={currentVal}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        style={{ width: 120, padding: '6px 10px', border: isDirty ? '2px solid #FFC107' : '1px solid #ddd', borderRadius: 4, fontSize: 13, fontWeight: 600, background: isDirty ? '#FFFEF5' : '#fff' }} />
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 8px', background: '#E3F2FD', borderRadius: 4, fontSize: 11, fontWeight: 500, color: '#1565C0' }}>
                        {field.unit}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 8px', background: field.category === 'SURGE' ? '#FFF3E0' : '#E8F5E9', borderRadius: 4, fontSize: 11, fontWeight: 500, color: field.category === 'SURGE' ? '#E65100' : '#2E7D32' }}>
                        {field.category}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {isDirty ? (
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#E65100', background: '#FFF3E0' }}>Modified</span>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#2E7D32', background: '#E8F5E9' }}>Saved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 24, padding: 20, background: '#E3F2FD', borderRadius: 8, borderLeft: '4px solid #1A73E8' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1565C0', margin: '0 0 8px' }}>How Pricing Works</p>
        <ul style={{ fontSize: 12, color: '#333', margin: 0, paddingLeft: 20 }}>
          <li><strong>Base Fare</strong> — charged at ride start, independent of distance/time</li>
          <li><strong>Per Km / Per Minute</strong> — distance and time rates used by FareCalculatorService</li>
          <li><strong>Night Charge</strong> — flat surcharge applied between 10PM and 5AM</li>
          <li><strong>Peak / Festival / Airport</strong> — conditional surcharges triggered by time or zone</li>
          <li><strong>AC Surcharge</strong> — default amount added when driver has AC vehicle and rider selects AC</li>
          <li><strong>Surge Multiplier</strong> — max allowed surge; demand threshold controls when surge activates</li>
        </ul>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', background: toast.includes('Failed') ? '#F44336' : '#4CAF50', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
