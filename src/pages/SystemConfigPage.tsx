import { useEffect, useState, useCallback } from 'react';
import api from '../api';

interface ConfigItem {
  id: number;
  configKey: string;
  configValue: string;
  description: string;
  category: string;
  updatedAt: string;
}

type SettingsTab = 'APPLICATION' | 'PAYMENTS' | 'MAPS' | 'SMS' | 'EMAIL';

const TABS: { key: SettingsTab; label: string; icon: string }[] = [
  { key: 'APPLICATION', label: 'Application', icon: '🏠' },
  { key: 'PAYMENTS', label: 'Payments', icon: '💳' },
  { key: 'MAPS', label: 'Maps', icon: '🗺️' },
  { key: 'SMS', label: 'SMS', icon: '📱' },
  { key: 'EMAIL', label: 'Email', icon: '✉️' },
];

const SENSITIVE_KEYS = new Set([
  'payments.razorpay_key_secret',
  'sms.twilio_auth_token',
  'sms.msg91_auth_token',
  'email.smtp_password',
  'email.sendgrid_api_key',
]);

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<Record<string, ConfigItem[]>>({});
  const [activeTab, setActiveTab] = useState<SettingsTab>('APPLICATION');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/config');
      setConfigs(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const currentConfigs = configs[activeTab] || [];

  const handleChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
    setDirtyKeys(prev => new Set(prev).add(key));
  };

  const handleSaveSection = async () => {
    if (!confirm('Save configuration changes?')) return;
    setSaving(true);
    setSaveSuccess(null);
    try {
      const requests = currentConfigs
        .filter(c => dirtyKeys.has(c.configKey))
        .map(c => ({
          configKey: c.configKey,
          configValue: editedValues[c.configKey] !== undefined ? editedValues[c.configKey] : c.configValue,
        }));

      if (requests.length === 0) {
        setSaveSuccess('No changes to save.');
        setTimeout(() => setSaveSuccess(null), 3000);
        return;
      }

      await api.put('/config/bulk', requests);
      setDirtyKeys(new Set());
      setEditedValues({});
      setSaveSuccess(`${requests.length} setting(s) saved successfully.`);
      setTimeout(() => setSaveSuccess(null), 3000);
      fetchConfigs();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const getValue = (key: string) => {
    if (editedValues[key] !== undefined) return editedValues[key];
    const item = currentConfigs.find(c => c.configKey === key);
    return item?.configValue || '';
  };

  const hasChanges = dirtyKeys.size > 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <p style={{ color: '#757575', fontSize: 14 }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Settings</h1>
          <p style={{ color: '#757575', fontSize: 14 }}>Manage application configuration</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saveSuccess && (
            <span style={{ color: '#4CAF50', fontSize: 13, fontWeight: 500 }}>{saveSuccess}</span>
          )}
          {error && (
            <span style={{ color: '#F44336', fontSize: 13 }}>{error}</span>
          )}
          <button
            onClick={fetchConfigs}
            style={{ padding: '6px 16px', background: '#E3F2FD', color: '#1A73E8', border: '1px solid #BBDEFB', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            Reload
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E0E0E0', marginBottom: 24 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: activeTab === tab.key ? '#1A73E8' : '#757575',
              borderBottom: activeTab === tab.key ? '2px solid #1A73E8' : '2px solid transparent',
              marginBottom: -2,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {currentConfigs.length === 0 ? (
          <p style={{ color: '#9E9E9E', textAlign: 'center', padding: 40 }}>No settings found for this section.</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {currentConfigs.map(config => (
                <SettingField
                  key={config.configKey}
                  config={config}
                  value={getValue(config.configKey)}
                  onChange={(val) => handleChange(config.configKey, val)}
                  isSensitive={SENSITIVE_KEYS.has(config.configKey)}
                  isDirty={dirtyKeys.has(config.configKey)}
                />
              ))}
            </div>

            {/* Save Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid #E0E0E0',
            }}>
              {hasChanges && (
                <span style={{ fontSize: 12, color: '#FF9800', alignSelf: 'center' }}>
                  Unsaved changes ({dirtyKeys.size})
                </span>
              )}
              <button
                onClick={handleSaveSection}
                disabled={saving || !hasChanges}
                style={{
                  padding: '10px 28px',
                  background: hasChanges ? '#1A73E8' : '#E0E0E0',
                  color: hasChanges ? '#fff' : '#9E9E9E',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: hasChanges ? 'pointer' : 'default',
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SettingField({ config, value, onChange, isSensitive, isDirty }: {
  config: ConfigItem;
  value: string;
  onChange: (val: string) => void;
  isSensitive: boolean;
  isDirty: boolean;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const isBoolean = value === 'true' || value === 'false' || config.description?.toLowerCase().includes('enable') || config.description?.toLowerCase().includes('mode');

  // Detect toggle fields by config key patterns or descriptions
  const isToggle = config.configKey.endsWith('_mode') ||
    config.configKey.endsWith('_enabled') ||
    config.configKey.endsWith('_tls') ||
    config.configKey === 'payments.test_mode' ||
    config.description?.toLowerCase().startsWith('enable') ||
    config.description?.toLowerCase().includes('(true/false)');

  if (isToggle) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F5F5F5' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#333', margin: 0 }}>
            {config.description || config.configKey}
          </p>
          <p style={{ fontSize: 11, color: '#9E9E9E', margin: '2px 0 0' }}><code>{config.configKey}</code></p>
        </div>
        <ToggleSwitch
          checked={value === 'true'}
          onChange={(checked) => onChange(checked ? 'true' : 'false')}
          isDirty={isDirty}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #F5F5F5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
          {config.description || config.configKey}
        </label>
        {isDirty && <span style={{ fontSize: 10, color: '#FF9800', fontWeight: 600 }}>MODIFIED</span>}
      </div>
      <p style={{ fontSize: 11, color: '#9E9E9E', margin: '0 0 6px' }}><code>{config.configKey}</code></p>
      <div style={{ position: 'relative' }}>
        <input
          type={isSensitive && !showSecret ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: isSensitive ? '10px 40px 10px 12px' : '10px 12px',
            border: `1px solid ${isDirty ? '#1A73E8' : '#E0E0E0'}`,
            borderRadius: 6,
            fontSize: 14,
            boxSizing: 'border-box',
            background: isDirty ? '#F3F8FF' : '#fff',
          }}
        />
        {isSensitive && (
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              fontSize: 12,
              color: '#757575',
            }}
          >
            {showSecret ? '🙈' : '👁️'}
          </button>
        )}
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, isDirty }: { checked: boolean; onChange: (val: boolean) => void; isDirty: boolean }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 26,
        borderRadius: 13,
        border: `2px solid ${isDirty ? '#1A73E8' : checked ? '#4CAF50' : '#BDBDBD'}`,
        background: checked ? '#4CAF50' : '#E0E0E0',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: 1,
        left: checked ? 22 : 1,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}
