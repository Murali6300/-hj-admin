/**
 * AlertsCenterPage — AI Alerts Center.
 *
 * Severity-sorted operational feed aggregating fraud flags, SOS
 * emergencies, urgent support tickets, KYC backlog, fleet availability
 * and cancellation spikes.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/AiIntelligence.css';

interface AlertItem {
  id: string; source: string; severity: string; category: string; title: string;
  message: string; route: string; permission: string; time: string;
  entityId: number | null; entityName: string;
}
interface Alerts {
  generatedAt: string; total: number;
  bySeverity: Record<string, number>; alerts: AlertItem[]; insights: string[];
}

const SEV_ICON: Record<string, string> = {
  CRITICAL: '🚨', HIGH: '⚠️', MEDIUM: '🟡', LOW: '🔵',
};

export default function AlertsCenterPage() {
  const [data, setData] = useState<Alerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchAlerts = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Alerts>('/ai/alerts');
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const t = setInterval(fetchAlerts, 30000);
    return () => clearInterval(t);
  }, [fetchAlerts]);

  return (
    <div className="ai">
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Alerts Center</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> LIVE FEED</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Every fraud, safety, support and operations signal in one severity-sorted feed
          </p>
        </div>
        {data && (
          <div className="ai-header__right">
            <span className="ai-header__time">🕒 {data.generatedAt} · auto-refresh 30s</span>
            <button className="ai-header__refresh" onClick={fetchAlerts}>Refresh</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="ai-loading" style={{ minHeight: 220 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Collecting alerts…</p>
        </div>
      ) : error ? (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Alerts failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={fetchAlerts}>Retry</button>
        </div>
      ) : data && (
        <>
          <div className="ai-grid ai-grid--4">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
              <div className="ai-card" key={sev}>
                <div className="ai-card__label">{sev}</div>
                <div className="ai-card__value" style={{ color: sev === 'CRITICAL' ? '#B91C1C' : sev === 'HIGH' ? '#EA580C' : sev === 'MEDIUM' ? '#B45309' : '#1D4ED8' }}>
                  {data.bySeverity[sev] ?? 0}
                </div>
                <div className="ai-card__sub">open alert(s)</div>
              </div>
            ))}
          </div>

          {data.alerts.length === 0 ? (
            <div className="ai-empty">
              <div className="ai-empty__icon">✅</div>
              <div className="ai-empty__text">No alerts right now — the platform is running smoothly.</div>
            </div>
          ) : (
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">🔔</span> Alert Feed ({data.alerts.length})</div>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {data.alerts.map((alert) => (
                  <div className={`ai-alert ai-alert--${alert.severity === 'CRITICAL' ? 'HIGH' : alert.severity}`} key={alert.id}>
                    <div className="ai-alert__icon">{SEV_ICON[alert.severity] ?? '🔔'}</div>
                    <div className="ai-alert__body">
                      <div className="ai-alert__head">
                        <span className="ai-alert__title">{alert.title}</span>
                        <span className={`ai-sev ai-sev--${alert.severity}`}>{alert.severity}</span>
                      </div>
                      <div className="ai-alert__desc">{alert.message}</div>
                      <div className="ai-alert__meta">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="ai-alert__entity">{alert.source}</span>
                          <span className="ai-alert__entity" style={{ background: '#F1F5F9', color: '#475569' }}>{alert.entityName}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span className="ai-alert__rule">{alert.time}</span>
                          <button
                            className="ai-header__refresh"
                            onClick={() => navigate(alert.route)}
                            style={{ padding: '4px 12px', fontSize: 12 }}
                          >
                            Open →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.insights.length > 0 && (
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">💡</span> Feed Insights</div>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {data.insights.map((ins) => (
                  <div className="ai-insight" key={ins}>
                    <span className="ai-insight__icon">💡</span>
                    <div className="ai-insight__msg">{ins}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
