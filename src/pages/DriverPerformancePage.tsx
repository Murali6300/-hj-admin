/**
 * DriverPerformancePage — AI Driver Performance.
 *
 * Ranked driver list with AI safety score, performance level, and best
 * shift; detail view shows shift-level analysis and recommendations.
 */

import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import '../styles/AiIntelligence.css';

/* ── Types ────────────────────────────────────────────────────── */

interface DriverPerformance {
  driverId: number;
  name: string;
  vehicleType: string;
  rating: number;
  ratingCount: number;
  acceptanceRatePct: number;
  cancellationRatePct: number;
  earnings: number;
  onlineHours: number;
  complaints: number;
  safetyScore: number;
  performanceLevel: string;
  bestShift: string;
}

interface DriverListResponse {
  drivers: DriverPerformance[];
  total: number;
  page: number;
  size: number;
}

interface ShiftStat {
  shift: string;
  rides: number;
  completed: number;
  cancelled: number;
  rating: number;
  performancePct: number;
}

interface SafetyFactor {
  label: string;
  impact: string;
}

interface DriverDetail extends DriverPerformance {
  email: string;
  phoneNumber: string;
  completedRides: number;
  cancelledRides: number;
  shiftPerformance: ShiftStat[];
  safetyFactors: SafetyFactor[];
  recommendations: string[];
}

const LEVEL_META: Record<string, string> = {
  Excellent: 'ai-level--excellent',
  Good: 'ai-level--good',
  'At Risk': 'ai-level--risk',
  Poor: 'ai-level--poor',
};

function scoreCss(score: number): string {
  if (score >= 80) return 'ai-score--green';
  if (score >= 60) return 'ai-score--amber';
  return 'ai-score--red';
}

function scoreClass(score: number): string {
  if (score >= 80) return 'ai-score--green';
  if (score >= 60) return 'ai-score--amber';
  return 'ai-score--red';
}

function formatCurrency(value: number): string {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/* ── Component ────────────────────────────────────────────────── */

export default function DriverPerformancePage() {
  const [data, setData] = useState<DriverListResponse | null>(null);
  const [detail, setDetail] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (page: number) => {
    try {
      const res = await api.get<DriverListResponse>(`/ai/drivers/performance?page=${page}&size=10`);
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load driver performance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(0); }, [fetchData]);

  const openDetail = async (driverId: number) => {
    try {
      const res = await api.get<DriverDetail>(`/ai/drivers/performance/${driverId}`);
      setDetail(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load driver report.');
    }
  };

  if (loading) {
    return (
      <div className="ai-loading">
        <div className="ai-loading__spinner" />
        <p className="ai-loading__text">Scoring driver performance…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="ai-error">
        <div className="ai-error__icon">⚠️</div>
        <h3 className="ai-error__title">Failed to load driver performance</h3>
        <p className="ai-error__msg">{error}</p>
        <button className="ai-error__retry" onClick={() => { setLoading(true); setError(null); fetchData(0); }}>
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
            <h1>AI Driver Performance</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> AI SCORE</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            {detail
              ? `Report for ${detail.name}`
              : `${data.total} drivers ranked by earnings, safety & shift performance`}
          </p>
        </div>
        <div className="ai-header__right">
          {detail && (
            <button className="ai-header__refresh" onClick={() => setDetail(null)}>
              ← Back to list
            </button>
          )}
          <button className="ai-header__refresh" onClick={() => { setLoading(true); setError(null); fetchData(data.page); }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Detail view ─────────────────────────────────── */}
      {detail ? (
        <>
          {/* Score + overview */}
          <div className="ai-grid ai-grid--4">
            <div className="ai-card ai-card--accent">
              <div className="ai-card__label">AI Safety Score</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <span className={`ai-score ${scoreCss(detail.safetyScore)}`}>{detail.safetyScore}</span>
                <span className={`ai-level ${LEVEL_META[detail.performanceLevel] || 'ai-level--good'}`}>
                  {detail.performanceLevel}
                </span>
              </div>
              <div className="ai-card__sub">0–100 composite safety rating</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Rating</div>
              <div className="ai-card__value">⭐ {detail.rating.toFixed(1)}</div>
              <div className="ai-card__sub">{detail.ratingCount} ratings</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Acceptance / Cancellation</div>
              <div className="ai-card__value">{detail.acceptanceRatePct}%</div>
              <div className="ai-card__sub">Cancellations {detail.cancellationRatePct}% · {detail.completedRides} completed</div>
            </div>
            <div className="ai-card ai-card--amber">
              <div className="ai-card__label">Earnings / Online</div>
              <div className="ai-card__value">{formatCurrency(detail.earnings)}</div>
              <div className="ai-card__sub">{detail.onlineHours.toFixed(1)}h online</div>
            </div>
          </div>

          {/* Shift performance */}
          <div className="ai-section">
            <div className="ai-section__label">
              <span className="ai-section__label-icon">🕒</span> Shift Performance — Best: {detail.bestShift}
            </div>
            <div className="ai-table-wrap">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th>Shift</th>
                    <th>Rides</th>
                    <th>Completed</th>
                    <th>Cancelled</th>
                    <th>Rating</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.shiftPerformance.map((shift) => (
                    <tr key={shift.shift}>
                      <td className="ai-table__cell-main">{shift.shift}</td>
                      <td>{shift.rides}</td>
                      <td>{shift.completed}</td>
                      <td className={shift.cancelled > 0 ? '' : 'ai-table__cell-muted'}>{shift.cancelled}</td>
                      <td>{shift.rating > 0 ? shift.rating.toFixed(1) : '—'}</td>
                      <td>
                        <div className="ai-progress">
                          <div
                            className={`ai-progress__fill ${shift.performancePct < 50 ? 'ai-progress__fill--red' : shift.performancePct < 75 ? 'ai-progress__fill--amber' : ''}`}
                            style={{ width: `${shift.performancePct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Safety factors */}
          <div className="ai-cols">
            <div className="ai-section">
              <div className="ai-section__label">
                <span className="ai-section__label-icon">🛡️</span> Safety Factors
              </div>
              <div className="ai-table-wrap">
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>Factor</th>
                      <th>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.safetyFactors.map((f) => (
                      <tr key={f.label}>
                        <td className="ai-table__cell-main">{f.label}</td>
                        <td>{f.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ai-section">
              <div className="ai-section__label">
                <span className="ai-section__label-icon">🧠</span> AI Recommendations
              </div>
              <div className="ai-grid" style={{ gridTemplateColumns: '1fr' }}>
                {detail.recommendations.map((rec) => (
                  <div className="ai-insight" key={rec}>
                    <span className="ai-insight__icon">💡</span>
                    <div className="ai-insight__msg">{rec}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── Ranked list ──────────────────────────────── */}
          <div className="ai-section">
            <div className="ai-section__label">
              <span className="ai-section__label-icon">🏆</span> Driver Rankings
            </div>
            <div className="ai-table-wrap">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Driver</th>
                    <th>Vehicle</th>
                    <th>Rating</th>
                    <th>Acceptance</th>
                    <th>Cancellation</th>
                    <th>Earnings</th>
                    <th>Safety Score</th>
                    <th>Level</th>
                    <th>Best Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {data.drivers.map((driver, idx) => (
                    <tr key={driver.driverId} onClick={() => openDetail(driver.driverId)} style={{ cursor: 'pointer' }}>
                      <td className="ai-table__cell-muted">{data.page * data.size + idx + 1}</td>
                      <td className="ai-table__cell-main">{driver.name}</td>
                      <td>{driver.vehicleType}</td>
                      <td>⭐ {driver.rating.toFixed(1)} <span className="ai-table__cell-muted">({driver.ratingCount})</span></td>
                      <td>{driver.acceptanceRatePct}%</td>
                      <td>{driver.cancellationRatePct}%</td>
                      <td>{formatCurrency(driver.earnings)}</td>
                      <td>
                        <span className={`ai-score ${scoreClass(driver.safetyScore)}`} style={{ width: 40, height: 40, fontSize: 13 }}>
                          {driver.safetyScore}
                        </span>
                      </td>
                      <td>
                        <span className={`ai-level ${LEVEL_META[driver.performanceLevel] || 'ai-level--good'}`}>
                          {driver.performanceLevel}
                        </span>
                      </td>
                      <td>{driver.bestShift}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pager */}
            <div className="ai-pager">
              <span className="ai-pager__info">
                Page {data.page + 1} of {Math.max(1, Math.ceil(data.total / data.size))} · {data.total} drivers
              </span>
              <button
                className="ai-pager__btn"
                disabled={data.page === 0}
                onClick={() => { setLoading(true); setError(null); fetchData(data.page - 1); }}
              >
                ← Prev
              </button>
              <button
                className="ai-pager__btn"
                disabled={(data.page + 1) * data.size >= data.total}
                onClick={() => { setLoading(true); setError(null); fetchData(data.page + 1); }}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
