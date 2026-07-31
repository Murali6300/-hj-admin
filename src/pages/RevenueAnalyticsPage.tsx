/**
 * RevenueAnalyticsPage — AI Revenue Analytics.
 *
 * Daily / weekly / monthly / yearly revenue series with rule-based
 * forecasts for tomorrow, the next week, and the next month.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../api';
import '../styles/AiIntelligence.css';

/* ── Types ────────────────────────────────────────────────────── */

interface Forecast {
  label: string;
  expectedRevenue: number;
  formatted: string;
  confidence: string;
  trend: string;
  message: string;
}

interface SeriesPoint {
  label: string;
  revenue: number;
}

interface Insight {
  tone: string;
  title: string;
  message: string;
}

interface RevenueResponse {
  generatedAt: string;
  currency: string;
  tomorrow: Forecast;
  nextWeek: Forecast;
  nextMonth: Forecast;
  daily: SeriesPoint[];
  weekly: SeriesPoint[];
  monthly: SeriesPoint[];
  yearly: SeriesPoint[];
  insights: Insight[];
}

const TREND_META: Record<string, { label: string; icon: string }> = {
  rising: { label: 'RISING', icon: '📈' },
  falling: { label: 'FALLING', icon: '📉' },
  stable: { label: 'STABLE', icon: '➡️' },
};

const CONFIDENCE_META: Record<string, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

const TONE_ICON: Record<string, string> = {
  positive: '🟢',
  warning: '🟠',
  critical: '🔴',
  info: 'ℹ️',
};

/* ── Component ────────────────────────────────────────────────── */

export default function RevenueAnalyticsPage() {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<RevenueResponse>('/ai/revenue');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load revenue analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="ai-loading">
        <div className="ai-loading__spinner" />
        <p className="ai-loading__text">Analyzing revenue trends…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-error">
        <div className="ai-error__icon">⚠️</div>
        <h3 className="ai-error__title">Failed to load revenue analytics</h3>
        <p className="ai-error__msg">{error}</p>
        <button className="ai-error__retry" onClick={() => { setLoading(true); setError(null); fetchData(); }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const seriesMap: Record<string, SeriesPoint[]> = {
    daily: data.daily,
    weekly: data.weekly,
    monthly: data.monthly,
    yearly: data.yearly,
  };

  const forecastCards = [
    { key: 'tomorrow', forecast: data.tomorrow, accent: 'ai-card--accent' },
    { key: 'nextWeek', forecast: data.nextWeek, accent: '' },
    { key: 'nextMonth', forecast: data.nextMonth, accent: 'ai-card--amber' },
  ];

  return (
    <div className="ai">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Revenue Analytics</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> FORECAST</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Trend analysis with next-day, next-week &amp; next-month revenue forecasts
          </p>
        </div>
        <div className="ai-header__right">
          <span className="ai-header__time">Generated {data.generatedAt}</span>
          <button className="ai-header__refresh" onClick={() => { setLoading(true); setError(null); fetchData(); }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Forecasts ───────────────────────────────────── */}
      <div className="ai-grid">
        {forecastCards.map(({ key, forecast, accent }) => (
          <div className={`ai-card ${accent}`} key={key}>
            <div className="ai-card__label">Forecast · {forecast.label}</div>
            <div className="ai-card__value">{forecast.formatted}</div>
            <div className="ai-card__sub">
              {TREND_META[forecast.trend]?.icon || '➡️'} {TREND_META[forecast.trend]?.label || forecast.trend}
              {' · '}{CONFIDENCE_META[forecast.confidence] || forecast.confidence}
            </div>
            <div className="ai-card__sub">{forecast.message}</div>
          </div>
        ))}
      </div>

      {/* ── Trend series ────────────────────────────────── */}
      <div className="ai-section">
        <div className="ai-section__label">
          <span className="ai-section__label-icon">📊</span> Revenue Trend
          <div className="ai-tabs" style={{ marginLeft: 12 }}>
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((t) => (
              <button
                key={t}
                className={`ai-tabs__btn${tab === t ? ' ai-tabs__btn--active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="ai-panel">
          <div className="ai-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seriesMap[tab]} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#1E88E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Insights ────────────────────────────────────── */}
      <div className="ai-section">
        <div className="ai-section__label">
          <span className="ai-section__label-icon">🧠</span> AI Insights
        </div>
        <div className="ai-grid">
          {data.insights.map((insight) => (
            <div className="ai-insight" key={insight.title}>
              <span className="ai-insight__icon">{TONE_ICON[insight.tone] || 'ℹ️'}</span>
              <div>
                <div className="ai-insight__title">{insight.title}</div>
                <div className="ai-insight__msg">{insight.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
