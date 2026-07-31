/**
 * NotificationGeneratorPage — AI Notification Generator.
 *
 * Pick a template, choose a targeted audience (with live size estimate),
 * fine-tune the copy and deliver to users/drivers (in-app + push).
 */

import { useState, useEffect } from 'react';
import api from '../api';
import { hasPermission } from '../utils/adminPermissions';
import '../styles/AiIntelligence.css';

interface Template {
  key: string; label: string; description: string; audience: string; audienceLabel: string;
  type: string; icon: string; title: string; body: string;
}
interface Estimate { audience: string; audienceLabel: string; count: number; samples: string[]; }
interface SendResult { title: string; body: string; audienceLabel: string; recipientCount: number; delivered: number; sentAt: string; }

const AUDIENCES = [
  { key: 'ALL_USERS', label: 'All users' },
  { key: 'ALL_DRIVERS', label: 'All drivers' },
  { key: 'NEW_USERS_7D', label: 'Users joined in last 7 days' },
  { key: 'NEW_DRIVERS_7D', label: 'Drivers joined in last 7 days' },
  { key: 'FREQUENT_RIDERS', label: 'Frequent riders (5+ completed rides)' },
  { key: 'INACTIVE_DRIVERS_30D', label: 'Inactive drivers (no ride in 30+ days)' },
];

export default function NotificationGeneratorPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [audience, setAudience] = useState('ALL_USERS');
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  const canSend = hasPermission('NOTIFICATIONS_SEND');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<Template[]>('/ai/notifications/templates');
        setTemplates(res.data || []);
      } catch {
        setError('Failed to load templates.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title);
    setBody(selected.body);
    setAudience(selected.audience);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (!selected || !audience) return;
    (async () => {
      setEstimating(true);
      setEstimate(null);
      try {
        const res = await api.get<Estimate>('/ai/notifications/estimate', { params: { audience } });
        setEstimate(res.data);
      } catch { setEstimate(null); } finally { setEstimating(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, selected]);

  const handleSend = async () => {
    if (!selected) return;
    if (!title.trim() || !body.trim()) { setError('Title and body are required.'); return; }
    if (!canSend) { setError('You do not have permission to send notifications.'); return; }
    if (!confirm(`Send "${title}" to ${estimate?.count ?? 0} recipient(s)?`)) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.post<SendResult>('/ai/notifications/send?adminId=1', {
        templateKey: selected.key, audience, title, body,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ai">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Notification Generator</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> AI COPY</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Pick a template, target the right audience and deliver in one click
          </p>
        </div>
      </div>

      {error && (
        <div className="ai-alert" style={{ borderColor: '#FECACA', color: '#B91C1C', background: '#FEF2F2' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="ai-alert" style={{ borderColor: '#BBF7D0', color: '#15803D', background: '#F0FDF4' }}>
          ✅ Sent to <strong>{result.delivered}</strong> of <strong>{result.recipientCount}</strong> recipients
          ({result.audienceLabel}) at {new Date(result.sentAt).toLocaleString('en-IN')}. Title: “{result.title}”
        </div>
      )}

      {/* Templates */}
      <div className="ai-section">
        <div className="ai-section__label">
          <span className="ai-section__label-icon">📋</span> Templates
          <span className="ai-header__time"> {templates.length} ready to use</span>
        </div>
        {loading ? (
          <div className="ai-loading" style={{ minHeight: 140 }}>
            <div className="ai-loading__spinner" />
            <p className="ai-loading__text">Loading templates…</p>
          </div>
        ) : templates.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: 13 }}>No templates available.</p>
        ) : (
          <div className="ai-grid">
            {templates.map((t) => (
              <div
                key={t.key}
                className={`ai-list-item${selected?.key === t.key ? ' ai-list-item--active' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(t)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <strong style={{ fontSize: 14 }}>{t.label}</strong>
                </div>
                <p style={{ margin: '8px 0 0', color: '#64748B', fontSize: 12 }}>{t.description}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span className="ai-chip">🎯 {t.audienceLabel}</span>
                  <span className="ai-chip" style={{ color: t.type === 'OFFER' ? '#7C3AED' : '#0EA5E9' }}>{t.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose */}
      {selected && (
        <div className="ai-grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
          <div className="ai-panel">
            <div className="ai-section__label">
              <span className="ai-section__label-icon">✏️</span> Compose {selected.icon} {selected.label}
            </div>

            <div className="ai-section__label" style={{ marginTop: 14, fontSize: 12 }}>AUDIENCE</div>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, background: '#fff' }}
            >
              {AUDIENCES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>

            <div className="ai-section__label" style={{ marginTop: 14, fontSize: 12 }}>TITLE</div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 14 }}
            />

            <div className="ai-section__label" style={{ marginTop: 14, fontSize: 12 }}>MESSAGE</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, resize: 'vertical' }}
            />

            <button
              className="ai-error__retry"
              onClick={handleSend}
              disabled={sending || !canSend}
              style={{ marginTop: 16, background: canSend ? '#7C3AED' : '#CBD5E1', border: 'none', color: '#fff', padding: '10px 22px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {sending ? 'Sending…' : `🚀 Send to ${estimate ? estimate.count : '…'} recipient(s)`}
            </button>
            {!canSend && (
              <p style={{ marginTop: 8, fontSize: 12, color: '#94A3B8' }}>You need NOTIFICATIONS_SEND permission to send.</p>
            )}
          </div>

          {/* Audience estimate */}
          <div className="ai-panel">
            <div className="ai-section__label">
              <span className="ai-section__label-icon">🎯</span> Audience Estimate
            </div>
            {estimating ? (
              <div className="ai-loading" style={{ minHeight: 90 }}>
                <div className="ai-loading__spinner" />
              </div>
            ) : estimate ? (
              <>
                <div className="ai-card" style={{ marginBottom: 12 }}>
                  <div className="ai-card__label">{estimate.audienceLabel}</div>
                  <div className="ai-card__value" style={{ fontSize: 28 }}>{estimate.count.toLocaleString()}</div>
                </div>
                <div className="ai-section__label" style={{ fontSize: 12 }}>SAMPLE RECIPIENTS</div>
                {estimate.samples.length === 0 ? (
                  <p style={{ color: '#94A3B8', fontSize: 13 }}>No recipients match this audience yet.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {estimate.samples.map((s) => <div className="ai-chip" key={s} style={{ alignSelf: 'flex-start' }}>👤 {s}</div>)}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#94A3B8', fontSize: 13 }}>Select an audience to estimate reach.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
