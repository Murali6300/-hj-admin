/**
 * KpiForecastPage — AI 7-day ride & revenue forecast.
 *
 * Rule-based projection from the last 35 days of completed rides,
 * bucketed by day-of-week with weekly trend and seasonal factors.
 */

import { useState, useEffect } from 'react';
import api from '../api';
import '../styles/AiIntelligence.css';

interface DayForecast {
  date: string; weekday: string; expectedRides: number; expectedRevenue: number;
  confidence: string; trendPct: number; up: boolean;
}
interface Insight { tone: string; title: string; message: string; }
interface Forecast {
  generatedAt: string; window: string;
  days: DayForecast[]; totalRides: number; totalRevenue: number; insights: Insight[];
}

export default function KpiForecastPage() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Forecast>('/ai/forecast');
      setForecast(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to generate forecast.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForecast(); }, []);

  return (
    <div className="ai">
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Forecasting</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> 7-DAY FORECAST</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Expected rides and revenue for the next 7 days, learned from the last 35 days of demand
          </p>
        </div>
        {forecast && (
          <div className="ai-header__right">
            <span className="ai-header__time">🔮 {forecast.window} · {forecast.generatedAt}</span>
            <button className="ai-header__refresh" onClick={fetchForecast}>Refresh</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="ai-loading" style={{ minHeight: 220 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Projecting demand…</p>
        </div>
      ) : error ? (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Forecast failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={fetchForecast}>Retry</button>
        </div>
      ) : forecast && (
        <>
          <div className="ai-grid ai-grid--4">
            <div className="ai-card ai-card--accent">
              <div className="ai-card__label">Next 7 days</div>
              <div className="ai-card__value">{forecast.totalRides}</div>
              <div className="ai-card__sub">expected rides</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Expected revenue</div>
              <div className="ai-card__value">₹{forecast.totalRevenue.toLocaleString('en-IN')}</div>
              <div className="ai-card__sub">across the window</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Confidence</div>
              <div className="ai-card__value" style={{ fontSize: 20, marginTop: 12 }}>
                <span className={`ai-chip${forecast.days.length ? '' : ''}`}>{forecast.days[0]?.confidence ?? '—'}</span>
              </div>
              <div className="ai-card__sub">based on recent data volume</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Daily average</div>
              <div className="ai-card__value">₹{(forecast.totalRevenue / 7).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div className="ai-card__sub">projected per day</div>
            </div>
          </div>

          <div className="ai-section">
            <div className="ai-section__label">
              <span className="ai-section__label-icon">📆</span> Day-by-Day Projection
            </div>
            <div className="ai-grid">
              {forecast.days.map((d) => (
                <div className="ai-card" key={d.date}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="ai-card__label">{d.weekday}</span>
                    <span className={`ai-chip${d.up ? ' ai-chip--ok' : ' ai-chip--warn'}`}>
                      {d.up ? '▲' : '▼'} {Math.abs(d.trendPct)}%
                    </span>
                  </div>
                  <div className="ai-card__value" style={{ fontSize: 22 }}>{d.expectedRides}</div>
                  <div className="ai-card__sub">rides expected · {d.date}</div>
                  <div className="ai-progress" style={{ marginTop: 10 }}>
                    <div
                      className="ai-progress__fill"
                      style={{
                        width: `${Math.min(100, (d.expectedRides / Math.max(1, Math.max(...forecast.days.map((x) => x.expectedRides)))) * 100)}%`,
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
                    <span style={{ color: '#64748B' }}>₹{d.expectedRevenue.toLocaleString('en-IN')}</span>
                    <span style={{ color: '#94A3B8' }}>{d.confidence} confidence</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ai-panel">
            <div className="ai-section__label"><span className="ai-section__label-icon">💡</span> AI Insights</div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {forecast.insights.map((ins) => (
                <div className="ai-insight" key={ins.title}>
                  <span className="ai-insight__icon">{ins.tone === 'positive' ? '✅' : ins.tone === 'warning' ? '⚠️' : '💡'}</span>
                  <div>
                    <div className="ai-insight__title">{ins.title}</div>
                    <div className="ai-insight__msg">{ins.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
