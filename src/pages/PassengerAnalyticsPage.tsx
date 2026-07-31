/**
 * PassengerAnalyticsPage — AI Passenger Analytics.
 *
 * Frequent riders, high-value customers, inactive users, cancellation
 * history, and complaint trends.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../api';
import '../styles/AiIntelligence.css';

/* ── Types ────────────────────────────────────────────────────── */

interface PassengerRow {
  userId: number;
  name: string;
  phone: string;
  primary: string;
  secondary: string;
  amount: number;
}

interface ComplaintTrend {
  period: string;
  count: number;
}

interface Insight {
  tone: string;
  title: string;
  message: string;
}

interface PassengerResponse {
  frequentRiders: PassengerRow[];
  highValueCustomers: PassengerRow[];
  inactiveUsers: PassengerRow[];
  cancellationHistory: PassengerRow[];
  complaintTrends: ComplaintTrend[];
  topComplainers: PassengerRow[];
  insights: Insight[];
}

const TONE_ICON: Record<string, string> = {
  positive: '🟢',
  warning: '🟠',
  critical: '🔴',
  info: 'ℹ️',
};

/* ── Component ────────────────────────────────────────────────── */

export default function PassengerAnalyticsPage() {
  const [data, setData] = useState<PassengerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<PassengerResponse>('/ai/passengers');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load passenger analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="ai-loading">
        <div className="ai-loading__spinner" />
        <p className="ai-loading__text">Analyzing passenger behavior…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-error">
        <div className="ai-error__icon">⚠️</div>
        <h3 className="ai-error__title">Failed to load passenger analytics</h3>
        <p className="ai-error__msg">{error}</p>
        <button className="ai-error__retry" onClick={() => { setLoading(true); setError(null); fetchData(); }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const passengerTable = (
    rows: PassengerRow[],
    primaryLabel: string,
    secondaryLabel: string,
    emptyText: string,
  ) => (
    rows.length === 0 ? (
      <div className="ai-empty">
        <div className="ai-empty__icon">👤</div>
        <div className="ai-empty__text">{emptyText}</div>
      </div>
    ) : (
      <div className="ai-table-wrap">
        <table className="ai-table">
          <thead>
            <tr>
              <th>Passenger</th>
              <th>{primaryLabel}</th>
              <th>{secondaryLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId}>
                <td>
                  <div className="ai-table__cell-main">{row.name}</div>
                  <div className="ai-table__cell-muted">{row.phone}</div>
                </td>
                <td className="ai-table__cell-main">{row.primary}</td>
                <td className="ai-table__cell-muted">{row.secondary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="ai">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Passenger Analytics</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> AI INSIGHT</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Riders, spend, inactivity, cancellations &amp; complaints
          </p>
        </div>
        <div className="ai-header__right">
          <button className="ai-header__refresh" onClick={() => { setLoading(true); setError(null); fetchData(); }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Summary chips ───────────────────────────────── */}
      <div className="ai-grid ai-grid--4">
        <div className="ai-card ai-card--accent">
          <div className="ai-card__label">Frequent Riders</div>
          <div className="ai-card__value">{data.frequentRiders.length}</div>
          <div className="ai-card__sub">Top by ride count</div>
        </div>
        <div className="ai-card ai-card--amber">
          <div className="ai-card__label">High-value Customers</div>
          <div className="ai-card__value">{data.highValueCustomers.length}</div>
          <div className="ai-card__sub">Top by spend</div>
        </div>
        <div className="ai-card">
          <div className="ai-card__label">Inactive Users</div>
          <div className="ai-card__value">{data.inactiveUsers.length}</div>
          <div className="ai-card__sub">No ride in 30 days</div>
        </div>
        <div className="ai-card">
          <div className="ai-card__label">Top Complainers</div>
          <div className="ai-card__value">{data.topComplainers.length}</div>
          <div className="ai-card__sub">Most support tickets</div>
        </div>
      </div>

      {/* ── Complaint trend ─────────────────────────────── */}
      <div className="ai-section">
        <div className="ai-section__label">
          <span className="ai-section__label-icon">📈</span> Complaint Trends (6 months)
        </div>
        <div className="ai-panel">
          <div className="ai-chart-wrap" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.complaintTrends} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(value: any) => [`${value} complaints`, 'Count']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Tables ──────────────────────────────────────── */}
      <div className="ai-cols">
        <div className="ai-section">
          <div className="ai-section__label">
            <span className="ai-section__label-icon">👑</span> Frequent Riders
          </div>
          <div className="ai-panel">
            {passengerTable(data.frequentRiders, 'Rides', 'Last ride', 'No riders yet')}
          </div>
        </div>

        <div className="ai-section">
          <div className="ai-section__label">
            <span className="ai-section__label-icon">💎</span> High-Value Customers
          </div>
          <div className="ai-panel">
            {passengerTable(
              data.highValueCustomers,
              'Total Spend',
              'Rides',
              'No high-value customers yet',
            )}
          </div>
        </div>

        <div className="ai-section">
          <div className="ai-section__label">
            <span className="ai-section__label-icon">😴</span> Inactive Users
          </div>
          <div className="ai-panel">
            {passengerTable(data.inactiveUsers, 'Last ride', 'Account', 'No inactive users')}
          </div>
        </div>

        <div className="ai-section">
          <div className="ai-section__label">
            <span className="ai-section__label-icon">❌</span> Cancellation History
          </div>
          <div className="ai-panel">
            {passengerTable(data.cancellationHistory, 'Cancellations', 'Last ride', 'No cancellations recorded')}
          </div>
        </div>

        <div className="ai-section">
          <div className="ai-section__label">
            <span className="ai-section__label-icon">🎫</span> Top Complainers
          </div>
          <div className="ai-panel">
            {passengerTable(data.topComplainers, 'Complaints', 'Last ticket', 'No complainers')}
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
