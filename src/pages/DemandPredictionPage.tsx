/**
 * DemandPredictionPage — AI Demand Prediction.
 *
 * Rule-based forecast for tomorrow: overall demand, expected ride count,
 * per-area demand with contributing factors, and an hourly forecast curve.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../api';
import '../styles/AiIntelligence.css';

/* ── Types ────────────────────────────────────────────────────── */

interface Factor {
  name: string;
  note: string;
  factor: number;
}

interface AreaDemand {
  area: string;
  demand: string;
  expectedRides: number;
  vsAverage: number;
  factors: Factor[];
}

interface HourForecast {
  hour: number;
  label: string;
  expectedRides: number;
}

interface Insight {
  tone: string;
  title: string;
  message: string;
}

interface DemandResponse {
  generatedAt: string;
  forecastDate: string;
  overallDemand: string;
  totalExpectedRides: number;
  areas: AreaDemand[];
  hourly: HourForecast[];
  insights: Insight[];
}

const DEMAND_META: Record<string, { label: string; css: string }> = {
  high: { label: 'HIGH DEMAND', css: 'ai-demand--high' },
  elevated: { label: 'ELEVATED', css: 'ai-demand--elevated' },
  normal: { label: 'NORMAL', css: 'ai-demand--normal' },
  low: { label: 'LOW', css: 'ai-demand--low' },
};

const TONE_ICON: Record<string, string> = {
  positive: '🟢',
  warning: '🟠',
  critical: '🔴',
  info: 'ℹ️',
};

/* ── Component ────────────────────────────────────────────────── */

export default function DemandPredictionPage() {
  const [data, setData] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<DemandResponse>('/ai/demand');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load demand prediction.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="ai-loading">
        <div className="ai-loading__spinner" />
        <p className="ai-loading__text">Forecasting tomorrow's demand…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-error">
        <div className="ai-error__icon">⚠️</div>
        <h3 className="ai-error__title">Failed to load demand prediction</h3>
        <p className="ai-error__msg">{error}</p>
        <button className="ai-error__retry" onClick={() => { setLoading(true); setError(null); fetchData(); }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="ai">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Demand Prediction</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> FORECAST</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Forecast for {data.forecastDate} · weather season, holidays &amp; events considered
          </p>
        </div>
        <div className="ai-header__right">
          <span className="ai-header__time">Generated {data.generatedAt}</span>
          <button className="ai-header__refresh" onClick={() => { setLoading(true); setError(null); fetchData(); }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────── */}
      <div className="ai-grid ai-grid--4">
        <div className="ai-card ai-card--accent">
          <div className="ai-card__label">Tomorrow · Overall Demand</div>
          <div className="ai-card__value">{DEMAND_META[data.overallDemand]?.label || data.overallDemand}</div>
          <div className="ai-card__sub">Aggregate across all areas</div>
        </div>
        <div className="ai-card ai-card--amber">
          <div className="ai-card__label">Expected Rides</div>
          <div className="ai-card__value">{data.totalExpectedRides}</div>
          <div className="ai-card__sub">Predicted for the full day</div>
        </div>
        <div className="ai-card">
          <div className="ai-card__label">Peak Hour</div>
          <div className="ai-card__value">
            {data.hourly.reduce((a, b) => (b.expectedRides > a.expectedRides ? b : a)).label}
          </div>
          <div className="ai-card__sub">
            {data.hourly.reduce((a, b) => (b.expectedRides > a.expectedRides ? b : a)).expectedRides} rides expected
          </div>
        </div>
        <div className="ai-card">
          <div className="ai-card__label">Hotspot Area</div>
          <div className="ai-card__value">
            {data.areas.reduce((a, b) => (b.expectedRides > a.expectedRides ? b : a)).area}
          </div>
          <div className="ai-card__sub">Highest expected ride volume</div>
        </div>
      </div>

      {/* ── Hourly forecast ─────────────────────────────── */}
      <div className="ai-section">
        <div className="ai-section__label">
          <span className="ai-section__label-icon">🕒</span> Hourly Demand Curve
        </div>
        <div className="ai-panel">
          <div className="ai-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.hourly} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} interval={3} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(value: any) => [`${value} rides`, 'Expected']}
                  labelFormatter={(label) => `Hour: ${label}`}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="expectedRides" stroke="#1E88E5" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Area predictions ────────────────────────────── */}
      <div className="ai-section">
        <div className="ai-section__label">
          <span className="ai-section__label-icon">📍</span> Area-wise Prediction
        </div>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Area</th>
                <th>Demand</th>
                <th>Expected Rides</th>
                <th>vs Average</th>
                <th>Factors</th>
              </tr>
            </thead>
            <tbody>
              {data.areas.map((area) => (
                <tr key={area.area}>
                  <td className="ai-table__cell-main">{area.area}</td>
                  <td>
                    <span className={`ai-demand ${DEMAND_META[area.demand]?.css || 'ai-demand--normal'}`}>
                      {DEMAND_META[area.demand]?.label || area.demand}
                    </span>
                  </td>
                  <td className="ai-table__cell-main">{area.expectedRides}</td>
                  <td className={area.vsAverage >= 0 ? 'ai-table__cell-main' : 'ai-table__cell-muted'}>
                    {area.vsAverage >= 0 ? `+${area.vsAverage.toFixed(1)}%` : `${area.vsAverage.toFixed(1)}%`}
                  </td>
                  <td>
                    <div className="ai-factors" style={{ marginTop: 0 }}>
                      {area.factors.map((f) => (
                        <span
                          key={f.name}
                          className={`ai-factor ${f.factor >= 1 ? 'ai-factor--up' : f.factor < 1 ? 'ai-factor--down' : ''}`}
                          title={`${f.note} (×${f.factor.toFixed(2)})`}
                        >
                          {f.factor >= 1 ? '▲' : '▼'} {f.name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
