/**
 * MonitoringPage — AI Operations Center for the HJ Admin Portal.
 *
 * Live monitoring of infrastructure health (API, DB, Redis, memory,
 * WebSocket, push delivery), ride demand, payment failures, GPS
 * mismatches, and per-area driver coverage — with rule-based
 * recommendations computed by the backend.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { hasPermission, type Permission } from '../utils/adminPermissions';
import '../styles/Monitoring.css';

/* ── Types ────────────────────────────────────────────────────── */

interface ServerInfo {
  status: string;
  uptimeSeconds: number;
  heapUsedMb: number;
  heapMaxMb: number;
  heapUsagePct: number;
  database: string;
}

interface Monitor {
  key: string;
  label: string;
  icon: string;
  status: string;
  value: string;
  message: string;
}

interface AreaAvailability {
  area: string;
  availableDrivers: number;
  status: string;
  message: string;
}

interface Recommendation {
  tone: string;
  title: string;
  message: string;
  route: string | null;
  permission: string | null;
}

interface MonitoringOverview {
  generatedAt: string;
  server: ServerInfo;
  monitors: Monitor[];
  areaAvailability: AreaAvailability[];
  recommendations: Recommendation[];
}

const REFRESH_MS = 30_000;

const STATUS_META: Record<string, { label: string; css: string }> = {
  ok: { label: 'OK', css: 'mon-status--ok' },
  warning: { label: 'WARNING', css: 'mon-status--warning' },
  critical: { label: 'CRITICAL', css: 'mon-status--critical' },
  unknown: { label: 'UNKNOWN', css: 'mon-status--unknown' },
};

const TONE_META: Record<string, string> = {
  positive: 'mon-rec--positive',
  warning: 'mon-rec--warning',
  critical: 'mon-rec--critical',
  info: 'mon-rec--info',
};

const routeAliases: Record<string, string> = { '/dashboard': '/' };

/* ── Helpers ──────────────────────────────────────────────────── */

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/* ── Component ────────────────────────────────────────────────── */

export default function MonitoringPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<MonitoringOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<MonitoringOverview>('/monitoring/overview');
      setData(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load monitoring data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  /* ── Loading State ────────────────────────────────────── */
  if (loading) {
    return (
      <div className="mon-loading">
        <div className="mon-loading__spinner" />
        <p className="mon-loading__text">Scanning live signals…</p>
      </div>
    );
  }

  /* ── Error State ──────────────────────────────────────── */
  if (error && !data) {
    return (
      <div className="mon-error">
        <div className="mon-error__icon">⚠️</div>
        <h3 className="mon-error__title">Failed to load monitoring data</h3>
        <p className="mon-error__msg">{error}</p>
        <button className="mon-error__retry" onClick={() => { setLoading(true); setError(null); fetchData(); }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const overall = data.monitors.some((m) => m.status === 'critical')
    ? 'critical'
    : data.monitors.some((m) => m.status === 'warning')
      ? 'warning'
      : 'ok';

  const counts = data.monitors.reduce<Record<string, number>>(
    (acc, m) => { acc[m.status] = (acc[m.status] || 0) + 1; return acc; },
    {},
  );

  const handleAction = (rec: Recommendation) => {
    if (!rec.route || !rec.permission) return;
    const route = routeAliases[rec.route] || rec.route;
    if (hasPermission(rec.permission as Permission)) {
      navigate(route);
    }
  };

  return (
    <div className="mon">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="mon-header">
        <div className="mon-header__left">
          <div className="mon-header__title-row">
            <h1>AI Operations Center</h1>
            <span className="mon-live-badge">
              <span className="mon-live-badge__dot" /> LIVE
            </span>
          </div>
          <p>Live monitoring — system health, ride demand, and driver coverage</p>
        </div>
        <div className="mon-header__right">
          {lastUpdated && (
            <span className="mon-header__time">
              Updated {lastUpdated.toLocaleTimeString()} · {data.generatedAt}
            </span>
          )}
          <button
            className="mon-header__refresh"
            onClick={() => { setLoading(true); setError(null); fetchData(); }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Status Summary ──────────────────────────────── */}
      <div className="mon-summary">
        <div className={`mon-summary__status mon-summary__status--${overall}`}>
          <span className="mon-summary__dot" />
          <div>
            <div className="mon-summary__label">{STATUS_META[overall]?.label || 'UNKNOWN'}</div>
            <div className="mon-summary__sub">Overall system status</div>
          </div>
        </div>
        <div className="mon-summary__chips">
          {Object.keys(STATUS_META).map((key) => {
            const count = counts[key] || 0;
            if (count === 0 && key !== 'ok') return null;
            return (
              <div className="mon-summary__chip" key={key}>
                <span className={`mon-dot mon-dot--${key}`} />
                <span className={`mon-summary__count mon-summary__count--${key}`}>{count}</span>
                <span className="mon-summary__chip-label">{STATUS_META[key].label}</span>
              </div>
            );
          })}
        </div>
        <div className="mon-summary__meta">
          <div className="mon-summary__meta-item">
            <span className="mon-summary__meta-label">Uptime</span>
            <span className="mon-summary__meta-value">{formatUptime(data.server.uptimeSeconds)}</span>
          </div>
          <div className="mon-summary__meta-item">
            <span className="mon-summary__meta-label">Database</span>
            <span className={`mon-summary__meta-value mon-summary__meta-value--${data.server.database === 'UP' ? 'ok' : 'critical'}`}>
              {data.server.database}
            </span>
          </div>
          <div className="mon-summary__meta-item">
            <span className="mon-summary__meta-label">Heap</span>
            <span className="mon-summary__meta-value">
              {data.server.heapUsagePct}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Recommendations ─────────────────────────────── */}
      <div className="mon-section">
        <div className="mon-section__label">
          <span className="mon-section__label-icon">🧠</span> AI Recommendations
        </div>
        <div className="mon-recs">
          {data.recommendations.map((rec) => (
            <div className={`mon-rec ${TONE_META[rec.tone] || ''}`} key={rec.title}>
              <div className="mon-rec__title">{rec.title}</div>
              <div className="mon-rec__msg">{rec.message}</div>
              {rec.route && rec.permission && hasPermission(rec.permission as Permission) && (
                <button className="mon-rec__action" onClick={() => handleAction(rec)}>
                  Open {rec.route.replace('/', '') || 'Dashboard'} →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Monitors Grid ───────────────────────────────── */}
      <div className="mon-section">
        <div className="mon-section__label">
          <span className="mon-section__label-icon">📡</span> Live Monitors
        </div>
        <div className="mon-grid">
          {data.monitors.map((m) => (
            <div className="mon-card" key={m.key}>
              <div className="mon-card__head">
                <span className="mon-card__icon">{m.icon}</span>
                <span className={`mon-status mon-status--${m.status}`}>
                  {STATUS_META[m.status]?.label || 'UNKNOWN'}
                </span>
              </div>
              <div className="mon-card__label">{m.label}</div>
              <div className="mon-card__value">{m.value}</div>
              <div className="mon-card__msg">{m.message}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Area Coverage ───────────────────────────────── */}
      <div className="mon-section">
        <div className="mon-section__label">
          <span className="mon-section__label-icon">🗺️</span> Driver Coverage by Area
        </div>
        <div className="mon-areas">
          {data.areaAvailability.map((area) => (
            <div className={`mon-area mon-area--${area.status}`} key={area.area}>
              <div className="mon-area__top">
                <span className={`mon-dot mon-dot--${area.status === 'ok' ? 'ok' : area.status === 'low' ? 'warning' : 'unknown'}`} />
                <span className="mon-area__name">{area.area}</span>
              </div>
              <div className="mon-area__count">
                {area.status === 'unknown' ? '—' : area.availableDrivers}
                <span className="mon-area__unit"> drivers</span>
              </div>
              <div className="mon-area__msg">{area.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
