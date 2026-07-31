/**
 * GoalTrackingPage — AI Goal Tracking.
 *
 * Shows live progress against business targets (rides, revenue, drivers,
 * users) with AI commentary, a 14-day trend, and inline target editing
 * (CONFIG_UPDATE permission).
 */

import { useState, useEffect } from 'react';
import api from '../api';
import { hasPermission } from '../utils/adminPermissions';
import '../styles/AiIntelligence.css';

interface Goal {
  key: string; label: string; period: string; unit: string;
  target: number; current: number; progressPct: number; commentary: string;
}
interface TrendPoint { date: string; rides: number; revenue: number; }
interface GoalData { goals: Goal[]; trend: TrendPoint[]; insights: string[]; }

const UNITS: Record<string, string> = { rides: 'rides', INR: '₹', drivers: 'drivers', users: 'users' };

function formatValue(v: number, unit: string): string {
  if (unit === 'INR') return `₹${Math.round(v).toLocaleString('en-IN')}`;
  return Math.round(v).toLocaleString('en-IN');
}

export default function GoalTrackingPage() {
  const [data, setData] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const canEdit = hasPermission('CONFIG_UPDATE');

  const fetchGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<GoalData>('/ai/goals');
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load goals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const startEdit = (g: Goal) => {
    setEditing(g.key);
    setDraft(String(g.target));
  };

  const saveGoal = async (g: Goal) => {
    const target = parseFloat(draft);
    if (isNaN(target) || target <= 0) { setDraft(String(g.target)); setEditing(null); return; }
    try {
      await api.post('/ai/goals', { key: g.key, target });
      setEditing(null);
      await fetchGoals();
    } catch {
      setDraft(String(g.target));
      setEditing(null);
    }
  };

  const maxRides = Math.max(1, ...(data?.trend ?? []).map((t) => t.rides));
  const maxRevenue = Math.max(1, ...(data?.trend ?? []).map((t) => t.revenue));

  return (
    <div className="ai">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Goal Tracking</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> LIVE</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Business targets with live progress and AI commentary
          </p>
        </div>
        <div className="ai-header__right">
          <button className="ai-header__refresh" onClick={fetchGoals}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="ai-loading" style={{ minHeight: 220 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Loading goals…</p>
        </div>
      ) : error ? (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Load failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={fetchGoals}>Retry</button>
        </div>
      ) : data && (
        <>
          {/* Goal cards */}
          <div className="ai-grid">
            {data.goals.map((g) => {
              const pct = Math.min(100, g.progressPct);
              const color = g.progressPct >= 80 ? '#22C55E' : g.progressPct >= 50 ? '#F59E0B' : '#EF4444';
              return (
                <div className="ai-card" key={g.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="ai-card__label">{g.label}</div>
                    <span className="ai-chip">{g.period}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                    <span className="ai-card__value" style={{ fontSize: 22 }}>
                      {formatValue(g.current, g.unit)}
                    </span>
                    <span style={{ color: '#64748B', fontSize: 13 }}>
                      of {formatValue(g.target, g.unit)} · {Math.round(g.progressPct)}%
                    </span>
                  </div>
                  <div className="ai-progress" style={{ marginTop: 12 }}>
                    <div className="ai-progress__fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{g.commentary}</span>
                    {canEdit && editing !== g.key && (
                      <button className="ai-header__refresh" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startEdit(g)}>Edit</button>
                    )}
                  </div>
                  {canEdit && editing === g.key && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                      <input
                        type="number"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        style={{ width: 120, padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}
                      />
                      <button className="ai-error__retry" onClick={() => saveGoal(g)} style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                      <button className="ai-header__refresh" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Insights */}
          {data.insights.length > 0 && (
            <div className="ai-section">
              <div className="ai-section__label"><span className="ai-section__label-icon">💡</span> AI Insights</div>
              <div className="ai-grid">
                {data.insights.map((ins) => (
                  <div className="ai-insight" key={ins}>
                    <span className="ai-insight__icon">💡</span>
                    <div className="ai-insight__msg">{ins}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 14-day trend */}
          <div className="ai-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">🚕</span> Completed Rides — Last 14 Days</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110 }}>
                {data.trend.map((t) => (
                  <div key={t.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: '#94A3B8' }}>{t.rides > 0 ? t.rides : ''}</span>
                    <div className="ai-bar" style={{ height: `${Math.max(3, (t.rides / maxRides) * 85)}px`, background: t.rides > 0 ? '#7C3AED' : '#E2E8F0' }} />
                    <span style={{ fontSize: 8, color: '#CBD5E1' }}>{t.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">💰</span> Revenue — Last 14 Days</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110 }}>
                {data.trend.map((t) => (
                  <div key={t.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: '#94A3B8' }}>{t.revenue > 0 ? `₹${Math.round(t.revenue / 1000)}k` : ''}</span>
                    <div className="ai-bar" style={{ height: `${Math.max(3, (t.revenue / maxRevenue) * 85)}px`, background: t.revenue > 0 ? '#22C55E' : '#E2E8F0' }} />
                    <span style={{ fontSize: 8, color: '#CBD5E1' }}>{t.date.slice(5)}</span>
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
