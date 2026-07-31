/**
 * BusinessDashboardPage — AI Business Dashboard for the HJ Admin Portal.
 *
 * Shows operational headline KPIs (rides, drivers, passengers, revenue,
 * peak hours, availability, KYC, complaints) and surfaces rule-based
 * AI insights computed from live data by the backend.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../api';
import '../styles/BusinessDashboard.css';

/* ── Types ────────────────────────────────────────────────────── */

interface Kpi { label: string; value: string; icon: string; tone: string; hint: string; }
interface HourStat { hour: number; label: string; rides: number; completed: number; cancelled: number; }
interface Availability { online: number; total: number; pct: number; }
interface Insight { tone: string; title: string; message: string; }

interface BusinessDashboard {
  kpis: Kpi[];
  peakHours: HourStat[];
  topPeakHours: string[];
  driverAvailability: Availability;
  insights: Insight[];
}

const REFRESH_MS = 60_000;

/* ── Component ────────────────────────────────────────────────── */

export default function BusinessDashboardPage() {
  const [data, setData] = useState<BusinessDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<BusinessDashboard>('/business/dashboard');
      setData(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load business dashboard.';
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
      <div className="biz-loading">
        <div className="biz-loading__spinner" />
        <p className="biz-loading__text">Computing business intelligence…</p>
      </div>
    );
  }

  /* ── Error State ──────────────────────────────────────── */
  if (error && !data) {
    return (
      <div className="biz-error">
        <div className="biz-error__icon">⚠️</div>
        <h3 className="biz-error__title">Failed to load business dashboard</h3>
        <p className="biz-error__msg">{error}</p>
        <button className="biz-error__retry" onClick={() => { setLoading(true); setError(null); fetchData(); }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const availabilityPct = data.driverAvailability.pct;

  return (
    <div className="biz">
      {/* ── Page Header ──────────────────────────────── */}
      <div className="biz-header">
        <div className="biz-header__left">
          <h1>AI Business Dashboard</h1>
          <p>Operational intelligence — metrics and insights from live platform data</p>
        </div>
        <div className="biz-header__right">
          {lastUpdated && (
            <span className="biz-header__time">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            className="biz-header__refresh"
            onClick={() => { setLoading(true); setError(null); fetchData(); }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── AI Insights ───────────────────────────────── */}
      <div className="biz-insights">
        <div className="biz-section-label">
          <span className="biz-section-label__icon">🤖</span> AI Insights
        </div>
        {data.insights.map((insight, i) => (
          <div className={`biz-insight biz-insight--${insight.tone}${i === 0 ? ' biz-insight--hero' : ''}`} key={insight.title}>
            <div className="biz-insight__badge">AI Insight</div>
            <div className="biz-insight__title">{insight.title}</div>
            <div className="biz-insight__msg">{insight.message}</div>
          </div>
        ))}
      </div>

      {/* ── KPI Grid ─────────────────────────────────── */}
      <div className="biz-kpis">
        {data.kpis.map((kpi) => (
          <div className="biz-kpi" key={kpi.label}>
            <div className={`biz-kpi__icon biz-kpi__icon--${kpi.tone}`}>{kpi.icon}</div>
            <div className="biz-kpi__content">
              <div className={`biz-kpi__value biz-kpi__value--${kpi.tone}`}>{kpi.value}</div>
              <div className="biz-kpi__label">{kpi.label}</div>
              <div className="biz-kpi__hint">{kpi.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Peak Hours + Availability ────────────────── */}
      <div className="biz-grid">
        <div className="biz-chart-card">
          <div className="biz-chart-card__header">
            <h3 className="biz-chart-card__title">Peak Hours — Rides by Hour (last 7 days)</h3>
            <div className="biz-chart-card__tops">
              {data.topPeakHours.map((h) => (
                <span className="biz-chart-card__top" key={h}>{h}</span>
              ))}
            </div>
          </div>
          {data.peakHours.some((h) => h.rides > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" fontSize={10} stroke="#94A3B8" interval={1} />
                <YAxis fontSize={11} stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed" name="Completed" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#94A3B8', textAlign: 'center', padding: 40, fontSize: 13 }}>No ride data available</p>
          )}
        </div>

        <div className="biz-availability">
          <h3 className="biz-availability__title">Driver Availability</h3>
          <div className={`biz-availability__value biz-availability__value--${availabilityPct < 50 ? 'red' : availabilityPct < 70 ? 'orange' : 'green'}`}>
            {availabilityPct}%
          </div>
          <div className="biz-availability__bar">
            <div
              className={`biz-availability__fill biz-availability__fill--${availabilityPct < 50 ? 'red' : availabilityPct < 70 ? 'orange' : 'green'}`}
              style={{ width: `${Math.min(Math.max(availabilityPct, 2), 100)}%` }}
            />
          </div>
          <div className="biz-availability__stats">
            <div className="biz-availability__stat">
              <span className="biz-availability__stat-value">{data.driverAvailability.online}</span>
              <span className="biz-availability__stat-label">Online</span>
            </div>
            <div className="biz-availability__stat">
              <span className="biz-availability__stat-value">{data.driverAvailability.total}</span>
              <span className="biz-availability__stat-label">Total</span>
            </div>
          </div>
          <p className="biz-availability__note">
            {availabilityPct >= 70
              ? 'Supply is healthy for current demand.'
              : availabilityPct >= 50
                ? 'Supply is adequate — watch peak windows.'
                : 'Driver availability is low. Consider incentives.'}
          </p>
        </div>
      </div>
    </div>
  );
}
