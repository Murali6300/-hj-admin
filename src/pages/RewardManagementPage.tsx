/**
 * RewardManagementPage — Reward tiers, points and driver leaderboard.
 *
 * Drivers are tiered by completed rides in the last 30 days and
 * awarded 10 points per ride.
 */

import { useState, useEffect } from 'react';
import api from '../api';
import '../styles/AiIntelligence.css';

interface Tier { name: string; range: string; drivers: number; totalRides: number; }
interface DriverReward {
  driverId: number; name: string; vehicleType: string; vehicleNumber: string;
  rides: number; earnings: number; tier: string; points: number;
}
interface Rewards {
  generatedAt: string; window: string; tiers: Tier[];
  totalDrivers: number; totalPoints: number; leaderboard: DriverReward[]; insights: string[];
}

const TIER_COLOR: Record<string, string> = {
  Bronze: '#B45309',
  Silver: '#64748B',
  Gold: '#CA8A04',
  Platinum: '#1E293B',
};

export default function RewardManagementPage() {
  const [data, setData] = useState<Rewards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Rewards>('/ai/rewards');
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load rewards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRewards(); }, []);

  return (
    <div className="ai">
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>Reward Management</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> REWARDS AI</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Driver tiers, reward points and leaderboard for the last 30 days
          </p>
        </div>
        {data && (
          <div className="ai-header__right">
            <span className="ai-header__time">🏆 {data.window} · {data.generatedAt}</span>
            <button className="ai-header__refresh" onClick={fetchRewards}>Refresh</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="ai-loading" style={{ minHeight: 220 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Computing rewards…</p>
        </div>
      ) : error ? (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Rewards failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={fetchRewards}>Retry</button>
        </div>
      ) : data && (
        <>
          <div className="ai-grid ai-grid--4">
            <div className="ai-card ai-card--accent">
              <div className="ai-card__label">Points issued</div>
              <div className="ai-card__value">{data.totalPoints.toLocaleString('en-IN')}</div>
              <div className="ai-card__sub">10 points per completed ride</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Drivers ranked</div>
              <div className="ai-card__value">{data.totalDrivers}</div>
              <div className="ai-card__sub">with completed rides in window</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Total rides</div>
              <div className="ai-card__value">{data.tiers.reduce((sum, t) => sum + t.totalRides, 0)}</div>
              <div className="ai-card__sub">completed across the fleet</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Platinum drivers</div>
              <div className="ai-card__value">{data.tiers.find((t) => t.name === 'Platinum')?.drivers ?? 0}</div>
              <div className="ai-card__sub">50+ rides — top tier</div>
            </div>
          </div>

          <div className="ai-section">
            <div className="ai-section__label"><span className="ai-section__label-icon">🎖️</span> Tier Distribution</div>
            <div className="ai-grid ai-grid--4">
              {data.tiers.map((t) => (
                <div className="ai-card" key={t.name} style={{ borderTop: `3px solid ${TIER_COLOR[t.name]}` }}>
                  <div className="ai-card__label" style={{ color: TIER_COLOR[t.name] }}>{t.name}</div>
                  <div className="ai-card__value">{t.drivers}</div>
                  <div className="ai-card__sub">{t.range} · {t.totalRides} rides</div>
                  <div className="ai-progress" style={{ marginTop: 10 }}>
                    <div
                      className="ai-progress__fill"
                      style={{
                        width: `${data.totalDrivers === 0 ? 0 : (t.drivers / data.totalDrivers) * 100}%`,
                        background: TIER_COLOR[t.name],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ai-panel">
            <div className="ai-section__label"><span className="ai-section__label-icon">📊</span> Leaderboard — Top 10</div>
            {data.leaderboard.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 12 }}>No ride data in the window yet.</p>
            ) : (
              <div className="ai-table-wrap" style={{ marginTop: 12 }}>
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Driver</th><th>Vehicle</th><th>Rides</th><th>Earnings</th><th>Tier</th><th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((d, idx) => (
                      <tr key={d.driverId}>
                        <td style={{ fontWeight: 800, color: idx < 3 ? '#B45309' : '#94A3B8' }}>{idx + 1}</td>
                        <td><span className="ai-table__cell-main">{d.name}</span></td>
                        <td className="ai-table__cell-muted">{d.vehicleType} {d.vehicleNumber}</td>
                        <td><span className="ai-table__cell-main">{d.rides}</span></td>
                        <td>₹{d.earnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td>
                          <span className="ai-chip" style={{ background: `${TIER_COLOR[d.tier]}1A`, color: TIER_COLOR[d.tier] }}>
                            {d.tier}
                          </span>
                        </td>
                        <td><span className="ai-table__cell-main">{d.points}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="ai-panel">
            <div className="ai-section__label"><span className="ai-section__label-icon">💡</span> AI Insights</div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {data.insights.map((ins) => (
                <div className="ai-insight" key={ins}>
                  <span className="ai-insight__icon">💡</span>
                  <div className="ai-insight__msg">{ins}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
