/**
 * FraudAlertsPage — AI Fraud Detection.
 *
 * Auto-generated rule-based alerts covering fake GPS, fake bookings,
 * multiple accounts, coupon abuse, fake referrals, and suspicious
 * payment activity.
 */

import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import '../styles/AiIntelligence.css';

/* ── Types ────────────────────────────────────────────────────── */

interface FraudAlert {
  type: string;
  severity: string;
  entityType: string;
  entityId: number;
  entityName: string;
  title: string;
  description: string;
  rule: string;
  detectedAt: string;
}

interface FraudAlertResponse {
  generatedAt: string;
  totalAlerts: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  alerts: FraudAlert[];
}

const TYPE_META: Record<string, { label: string; icon: string }> = {
  FAKE_GPS: { label: 'Fake GPS', icon: '📍' },
  FAKE_BOOKINGS: { label: 'Fake Bookings', icon: '📅' },
  MULTIPLE_ACCOUNTS: { label: 'Multiple Accounts', icon: '👥' },
  COUPON_ABUSE: { label: 'Coupon Abuse', icon: '🎟️' },
  FAKE_REFERRALS: { label: 'Fake Referrals', icon: '🤝' },
  SUSPICIOUS_PAYMENTS: { label: 'Suspicious Payments', icon: '💳' },
};

const ENTITY_ICON: Record<string, string> = {
  USER: '👤',
  DRIVER: '🚗',
  RIDE: '🚕',
  SYSTEM: '🖥️',
};

/* ── Component ────────────────────────────────────────────────── */

export default function FraudAlertsPage() {
  const [data, setData] = useState<FraudAlertResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<FraudAlertResponse>('/ai/fraud/alerts');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load fraud alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="ai-loading">
        <div className="ai-loading__spinner" />
        <p className="ai-loading__text">Scanning for fraud signals…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-error">
        <div className="ai-error__icon">⚠️</div>
        <h3 className="ai-error__title">Failed to load fraud alerts</h3>
        <p className="ai-error__msg">{error}</p>
        <button className="ai-error__retry" onClick={() => { setLoading(true); setError(null); fetchData(); }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const filteredAlerts = filter === 'ALL'
    ? data.alerts
    : data.alerts.filter((a) => a.type === filter);

  return (
    <div className="ai">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Fraud Detection</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> LIVE SCAN</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Auto-generated alerts from rule-based detectors across rides, payments &amp; referrals
          </p>
        </div>
        <div className="ai-header__right">
          <span className="ai-header__time">Generated {data.generatedAt}</span>
          <button className="ai-header__refresh" onClick={() => { setLoading(true); setError(null); fetchData(); }}>
            ↻ Re-scan
          </button>
        </div>
      </div>

      {/* ── Severity summary ────────────────────────────── */}
      <div className="ai-grid ai-grid--4">
        <div className="ai-card ai-card--accent">
          <div className="ai-card__label">Total Alerts</div>
          <div className="ai-card__value">{data.totalAlerts}</div>
          <div className="ai-card__sub">Detected by 6 rule engines</div>
        </div>
        <div className="ai-card">
          <div className="ai-card__label">High Severity</div>
          <div className="ai-card__value" style={{ color: '#DC2626' }}>{data.bySeverity.HIGH || 0}</div>
          <div className="ai-card__sub">Requires immediate review</div>
        </div>
        <div className="ai-card">
          <div className="ai-card__label">Medium Severity</div>
          <div className="ai-card__value" style={{ color: '#D97706' }}>{data.bySeverity.MEDIUM || 0}</div>
          <div className="ai-card__sub">Needs monitoring</div>
        </div>
        <div className="ai-card">
          <div className="ai-card__label">Low Severity</div>
          <div className="ai-card__value" style={{ color: '#1D4ED8' }}>{data.bySeverity.LOW || 0}</div>
          <div className="ai-card__sub">Informational signals</div>
        </div>
      </div>

      {/* ── Type filter ─────────────────────────────────── */}
      <div className="ai-section">
        <div className="ai-section__label">
          <span className="ai-section__label-icon">🎛️</span> Filter by Signal Type
        </div>
        <div className="ai-tabs" style={{ flexWrap: 'wrap' }}>
          <button
            className={`ai-tabs__btn${filter === 'ALL' ? ' ai-tabs__btn--active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All ({data.totalAlerts})
          </button>
          {Object.keys(TYPE_META).map((type) => (
            <button
              key={type}
              className={`ai-tabs__btn${filter === type ? ' ai-tabs__btn--active' : ''}`}
              onClick={() => setFilter(type)}
            >
              {TYPE_META[type]?.icon} {TYPE_META[type]?.label} ({data.byType[type] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* ── Alert list ──────────────────────────────────── */}
      <div className="ai-section">
        <div className="ai-section__label">
          <span className="ai-section__label-icon">🚨</span> Detected Alerts
        </div>
        {filteredAlerts.length === 0 ? (
          <div className="ai-empty">
            <div className="ai-empty__icon">✅</div>
            <div className="ai-empty__text">No alerts for this signal type</div>
          </div>
        ) : (
          <div className="ai-grid" style={{ gridTemplateColumns: '1fr' }}>
            {filteredAlerts.map((alert, idx) => (
              <div className={`ai-alert ai-alert--${alert.severity}`} key={`${alert.type}-${alert.entityId}-${idx}`}>
                <div className="ai-alert__icon">{TYPE_META[alert.type]?.icon || '🚩'}</div>
                <div className="ai-alert__body">
                  <div className="ai-alert__head">
                    <div className="ai-alert__title">{alert.title}</div>
                    <span className={`ai-alert__sev ai-alert__sev--${alert.severity}`}>
                      {alert.severity} · {TYPE_META[alert.type]?.label || alert.type}
                    </span>
                  </div>
                  <div className="ai-alert__desc">{alert.description}</div>
                  <div className="ai-alert__meta">
                    <span className="ai-alert__entity">
                      {ENTITY_ICON[alert.entityType] || '▪️'} {alert.entityName}
                    </span>
                    <span className="ai-alert__rule">⚙️ {alert.rule}</span>
                    <span className="ai-alert__rule">🕒 {alert.detectedAt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
