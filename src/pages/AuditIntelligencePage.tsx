/**
 * AuditIntelligencePage — AI Audit Log analysis.
 *
 * Patterns over the admin audit trail: action/entity breakdown,
 * most active admins, hourly activity and late-night anomaly detection.
 */

import { useState, useEffect } from 'react';
import api from '../api';
import '../styles/AiIntelligence.css';

interface CountItem { key: string; count: number; }
interface AdminActivity { adminId: number | null; email: string; actions: number; lastAction: string; }
interface HourActivity { hour: number; label: string; count: number; }
interface AuditAnalysis {
  generatedAt: string; totalEntries: number; uniqueAdmins: number; todayEntries: number;
  actions: CountItem[]; entities: CountItem[];
  topAdmins: AdminActivity[]; hourly: HourActivity[];
  lateNightEntries: number; lateNightAdmins: string[]; insights: string[];
}

export default function AuditIntelligencePage() {
  const [data, setData] = useState<AuditAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<AuditAnalysis>('/ai/audit-log');
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to analyze audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalysis(); }, []);

  const maxAction = Math.max(1, ...(data?.actions.map((a) => a.count) ?? [1]));
  const maxHour = Math.max(1, ...(data?.hourly.map((h) => h.count) ?? [1]));

  return (
    <div className="ai">
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Audit Logs</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> AUDIT AI</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Behavioral patterns and anomalies across the full admin audit trail
          </p>
        </div>
        {data && (
          <div className="ai-header__right">
            <span className="ai-header__time">🕒 {data.generatedAt}</span>
            <button className="ai-header__refresh" onClick={fetchAnalysis}>Refresh</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="ai-loading" style={{ minHeight: 220 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Analyzing audit trail…</p>
        </div>
      ) : error ? (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Analysis failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={fetchAnalysis}>Retry</button>
        </div>
      ) : data && (
        <>
          <div className="ai-grid ai-grid--4">
            <div className="ai-card ai-card--accent">
              <div className="ai-card__label">Total entries</div>
              <div className="ai-card__value">{data.totalEntries.toLocaleString('en-IN')}</div>
              <div className="ai-card__sub">in the audit trail</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Unique admins</div>
              <div className="ai-card__value">{data.uniqueAdmins}</div>
              <div className="ai-card__sub">distinct actors</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Today</div>
              <div className="ai-card__value">{data.todayEntries}</div>
              <div className="ai-card__sub">entries recorded today</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label" style={{ color: '#B91C1C' }}>Late-night</div>
              <div className="ai-card__value" style={{ color: data.lateNightEntries > 0 ? '#DC2626' : '#15803D' }}>
                {data.lateNightEntries}
              </div>
              <div className="ai-card__sub">entries 10 PM – 6 AM</div>
            </div>
          </div>

          <div className="ai-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">⚡</span> Top Actions</div>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {data.actions.length === 0 && <p style={{ color: '#94A3B8', fontSize: 13 }}>No audit entries yet.</p>}
                {data.actions.map((a) => (
                  <div key={a.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{a.key}</span>
                      <span style={{ color: '#64748B' }}>{a.count}</span>
                    </div>
                    <div className="ai-bar">
                      <div className="ai-bar__fill" style={{ width: `${(a.count / maxAction) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">🏷️</span> Entities Touched</div>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {data.entities.map((e) => (
                  <div key={e.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{e.key}</span>
                      <span style={{ color: '#64748B' }}>{e.count}</span>
                    </div>
                    <div className="ai-bar">
                      <div className="ai-bar__fill" style={{ width: `${(e.count / Math.max(1, data.entities[0]?.count ?? 1)) * 100}%`, background: '#22C55E' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ai-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">👤</span> Most Active Admins</div>
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {data.topAdmins.map((admin, idx) => (
                  <div className={`ai-list-item${idx === 0 ? ' ai-list-item--active' : ''}`} key={admin.email}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{admin.email}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>last activity {admin.lastAction}</div>
                    </div>
                    <span className="ai-chip ai-chip--info">{admin.actions} actions</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">🕐</span> Hourly Activity</div>
              <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
                {data.hourly.map((h) => (
                  <div key={h.hour} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 48, fontSize: 12, color: '#64748B' }}>{h.label}</span>
                    <div className="ai-bar" style={{ flex: 1 }}>
                      <div className="ai-bar__fill" style={{ width: `${(h.count / maxHour) * 100}%`, background: h.hour >= 22 || h.hour < 6 ? '#EF4444' : '#38BDF8' }} />
                    </div>
                    <span style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{h.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {data.lateNightAdmins.length > 0 && (
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">🌙</span> Late-Night Actors</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {data.lateNightAdmins.map((email) => (
                  <span className="ai-chip ai-chip--danger" key={email}>{email}</span>
                ))}
              </div>
            </div>
          )}

          <div className="ai-panel">
            <div className="ai-section__label"><span className="ai-section__label-icon">💡</span> AI Insights</div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {data.insights.map((ins) => (
                <div className="ai-insight" key={ins}>
                  <span className="ai-insight__icon">💡</span>
                  <div className="ai-insight__msg">{ins}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
