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

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/config');
      setConfigs(res.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      await api.put('/config', { configKey: key, configValue: value });
      setEditKey('');
      fetchConfigs();
    } catch { alert('Failed to update'); } finally { setSaving(false); }
  };

  const categories = [...new Set(configs.map(c => c.category))];

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>System Configuration</h1>

      {loading ? (
        <p>Loading configuration...</p>
      ) : (
        categories.map(cat => (
          <div key={cat} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12, color: '#1A73E8', borderBottom: '2px solid #1A73E8', paddingBottom: 8 }}>{cat}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                  <th style={thStyle}>Key</th>
                  <th style={thStyle}>Value</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.filter(c => c.category === cat).map(config => (
                  <tr key={config.configKey} style={{ borderBottom: '1px solid #E0E0E0' }}>
                    <td style={tdStyle}><code>{config.configKey}</code></td>
                    <td style={tdStyle}>
                      {editKey === config.configKey ? (
                        <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                          style={{ padding: '4px 8px', border: '1px solid #1A73E8', borderRadius: 4, fontSize: 13, width: 120 }} />
                      ) : (
                        <strong>{config.configValue}</strong>
                      )}
                    </td>
                    <td style={tdStyle}>{config.description}</td>
                    <td style={tdStyle}>
                      {editKey === config.configKey ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleSave(config.configKey, editValue)} disabled={saving} style={btnSuccess}>{saving ? 'Saving...' : 'Save'}</button>
                          <button onClick={() => setEditKey('')} style={btnCancel}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditKey(config.configKey); setEditValue(config.configValue); }} style={btnPrimary}>Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const btnPrimary: React.CSSProperties = { padding: '6px 12px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
const btnSuccess: React.CSSProperties = { padding: '6px 12px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
const btnCancel: React.CSSProperties = { padding: '6px 12px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
