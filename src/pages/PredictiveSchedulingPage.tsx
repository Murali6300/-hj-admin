/**
 * PredictiveSchedulingPage — AI driver staffing plan for tomorrow.
 *
 * Converts the demand forecast into per-shift driver headcount
 * recommendations and flags under-staffed windows.
 */

import { useState, useEffect } from 'react';
import api from '../api';
import '../styles/AiIntelligence.css';

interface ShiftPlan {
  label: string; hours: string; expectedRides: number; recommendedDrivers: number;
  driversOnlineNow: number; gap: number;
}
interface AreaPriority { area: string; expectedRides: number; demand: string; }
interface Plan {
  date: string; ridesPerDriver: number; shifts: ShiftPlan[]; areaPriorities: AreaPriority[]; insights: string[];
}

export default function PredictiveSchedulingPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Plan>('/ai/scheduling');
      setPlan(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to generate scheduling plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlan(); }, []);

  return (
    <div className="ai">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>Predictive Scheduling</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> FORECAST AI</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Recommended driver headcount per shift, derived from tomorrow's demand forecast
          </p>
        </div>
        {plan && (
          <div className="ai-header__right">
            <span className="ai-header__time">📅 {plan.date} · {plan.ridesPerDriver} rides/driver</span>
            <button className="ai-header__refresh" onClick={fetchPlan}>Refresh</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="ai-loading" style={{ minHeight: 220 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Building shift plan…</p>
        </div>
      ) : error ? (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Plan failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={fetchPlan}>Retry</button>
        </div>
      ) : plan && (
        <>
          {/* Shifts */}
          <div className="ai-section">
            <div className="ai-section__label">
              <span className="ai-section__label-icon">🗓️</span> Shift Plan — Recommended Drivers
            </div>
            <div className="ai-grid">
              {plan.shifts.map((s) => (
                <div className="ai-card" key={s.label} style={s.gap > 0 ? { borderColor: '#FECACA' } : {}}>
                  <div className="ai-card__label">{s.label}</div>
                  <div className="ai-card__value">{s.recommendedDrivers} drivers</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{s.hours}</div>
                  <div className="ai-progress" style={{ marginTop: 10 }}>
                    <div
                      className="ai-progress__fill"
                      style={{
                        width: `${Math.min(100, (s.driversOnlineNow / Math.max(1, s.recommendedDrivers)) * 100)}%`,
                        background: s.gap > 0 ? '#EF4444' : '#22C55E',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
                    <span style={{ color: '#64748B' }}>{s.expectedRides} rides expected</span>
                    <span style={{ color: s.gap > 0 ? '#DC2626' : '#15803D', fontWeight: 600 }}>
                      {s.gap > 0 ? `−${s.gap} understaffed` : 'covered'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{s.driversOnlineNow} online now</div>
                </div>
              ))}
            </div>
          </div>

          {/* Areas + Insights */}
          <div className="ai-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">📍</span> Top Demand Areas</div>
              {plan.areaPriorities.length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: 13 }}>No forecast data available.</p>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {plan.areaPriorities.map((a, idx) => (
                    <div key={a.area} className="ai-list-item" style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 13 }}><strong>{idx + 1}. {a.area}</strong> · ~{a.expectedRides} rides</span>
                      <span className={`ai-chip${a.demand === 'High' ? ' ai-chip--danger' : ''}`}>{a.demand} demand</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">💡</span> AI Insights</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {plan.insights.map((ins) => (
                  <div className="ai-insight" key={ins}>
                    <span className="ai-insight__icon">💡</span>
                    <div className="ai-insight__msg">{ins}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
