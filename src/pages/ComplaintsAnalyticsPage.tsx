/**
 * ComplaintsAnalyticsPage — AI Complaint Analysis.
 *
 * Auto-categorizes support tickets (safety, driver behavior, payment, …),
 * scores sentiment, buckets daily trends and surfaces urgent tickets with
 * AI-suggested responses.
 */

import { useState, useCallback, useEffect } from 'react';
import api from '../api';
import '../styles/AiIntelligence.css';

interface CategoryCount { category: string; count: number; percentage: number; avgSentiment: number; }
interface TrendPoint { date: string; count: number; }
interface Keyword { word: string; count: number; }
interface UrgentTicket {
  id: number; subject: string; category: string; sentiment: string;
  summary: string; suggestedResponse: string; priority: string; hoursOpen: number;
}
interface TicketDetail {
  id: number; subject: string; description: string; status: string; priority: string;
  createdAt: string; resolvedAt: string | null; category: string; sentiment: string;
  score: number; summary: string; keywords: string[]; suggestedResponse: string; hoursOpen: number;
}
interface Summary {
  total: number; openCount: number; resolvedCount: number; urgentCount: number; avgResolutionHours: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byCategory: CategoryCount[];
  positive: number; neutral: number; negative: number;
  dailyTrend: TrendPoint[]; topKeywords: Keyword[]; insights: string[]; urgentTickets: UrgentTicket[];
}

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

function dateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const CATEGORY_EMOJI: Record<string, string> = {
  Safety: '🛡️', 'Driver behavior': '🚖', 'Passenger behavior': '🧑‍🤝‍🧑',
  Payment: '💳', GPS: '📍', Vehicle: '🚗', 'App / Technical': '📱', Uncategorized: '📄',
};
const SENTIMENT_COLOR: Record<string, string> = { POSITIVE: '#22C55E', NEUTRAL: '#F59E0B', NEGATIVE: '#EF4444' };

export default function ComplaintsAnalyticsPage() {
  const [rangeDays, setRangeDays] = useState(30);
  const [from, setFrom] = useState(dateStr(-30));
  const [to, setTo] = useState(dateStr(0));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const pickRange = (days: number) => {
    setRangeDays(days);
    setFrom(dateStr(-days));
    setTo(dateStr(0));
  };

  const fetchSummary = useCallback(async (f: string, t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Summary>('/ai/complaints', { params: { from: f, to: t } });
      setSummary(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to analyze complaints.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id: number) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.get<TicketDetail>(`/ai/complaints/${id}`);
      setDetail(res.data);
    } catch { setDetail(null); } finally { setDetailLoading(false); }
  };

  const maxTrend = Math.max(1, ...(summary?.dailyTrend ?? []).map((p) => p.count));
  const maxCategory = Math.max(1, ...(summary?.byCategory ?? []).map((c) => c.count));
  const totalSentiment = summary ? Math.max(1, summary.positive + summary.neutral + summary.negative) : 1;

  return (
    <div className="ai">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Complaint Analysis</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> SUPPORT AI</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Auto-categorization, sentiment scoring and urgency detection for support tickets
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="ai-panel">
        <div className="ai-tabs">
          {RANGES.map((r) => (
            <button
              key={r.days}
              className={`ai-tabs__btn${rangeDays === r.days ? ' ai-tabs__btn--active' : ''}`}
              onClick={() => pickRange(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13 }} />
          <span style={{ color: '#64748B', fontSize: 13 }}>→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13 }} />
          <button className="ai-error__retry" onClick={() => fetchSummary(from, to)} disabled={loading}>Analyze</button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="ai-loading" style={{ minHeight: 220 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Analyzing complaints…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Analysis failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={() => fetchSummary(from, to)}>Retry</button>
        </div>
      )}

      {/* Report */}
      {summary && !loading && (
        <>
          {/* Summary cards */}
          <div className="ai-grid">
            <div className="ai-card"><div className="ai-card__label">Total Tickets</div><div className="ai-card__value">{summary.total}</div></div>
            <div className="ai-card"><div className="ai-card__label">Open</div><div className="ai-card__value" style={{ color: '#F59E0B' }}>{summary.openCount}</div></div>
            <div className="ai-card"><div className="ai-card__label">Resolved</div><div className="ai-card__value" style={{ color: '#22C55E' }}>{summary.resolvedCount}</div></div>
            <div className="ai-card"><div className="ai-card__label">URGENT</div><div className="ai-card__value" style={{ color: '#EF4444' }}>{summary.urgentCount}</div></div>
            <div className="ai-card"><div className="ai-card__label">Avg Resolution</div><div className="ai-card__value">{summary.avgResolutionHours}h</div></div>
          </div>

          <div className="ai-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Categories */}
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">🗂️</span> Complaint Categories</div>
              {summary.byCategory.length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: 13 }}>No tickets in this period.</p>
              ) : summary.byCategory.map((c) => (
                <div key={c.category} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>{CATEGORY_EMOJI[c.category] || '📄'} {c.category}</span>
                    <span style={{ color: '#64748B' }}>{c.count} · {Math.round(c.percentage)}%</span>
                  </div>
                  <div className="ai-progress"><div className="ai-progress__fill" style={{ width: `${(c.count / maxCategory) * 100}%` }} /></div>
                  <div style={{ fontSize: 11, color: c.avgSentiment > 0.05 ? '#22C55E' : c.avgSentiment < -0.05 ? '#EF4444' : '#F59E0B', marginTop: 3 }}>
                    avg sentiment: {c.avgSentiment > 0 ? '+' : ''}{c.avgSentiment}
                  </div>
                </div>
              ))}
            </div>

            {/* Sentiment + Priority */}
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">😊</span> Sentiment</div>
              <div className="ai-progress"><div className="ai-progress__fill" style={{ width: `${(summary.positive / totalSentiment) * 100}%`, background: '#22C55E' }} /></div>
              <div className="ai-progress" style={{ marginTop: 6 }}><div className="ai-progress__fill" style={{ width: `${(summary.neutral / totalSentiment) * 100}%`, background: '#F59E0B' }} /></div>
              <div className="ai-progress" style={{ marginTop: 6 }}><div className="ai-progress__fill" style={{ width: `${(summary.negative / totalSentiment) * 100}%`, background: '#EF4444' }} /></div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13 }}>
                <span style={{ color: '#22C55E' }}>😀 {summary.positive}</span>
                <span style={{ color: '#F59E0B' }}>😐 {summary.neutral}</span>
                <span style={{ color: '#EF4444' }}>😠 {summary.negative}</span>
              </div>

              <div className="ai-section__label" style={{ marginTop: 20 }}><span className="ai-section__label-icon">🔺</span> Priority</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {summary.byPriority.map((p) => (
                  <span key={p.priority} className={`ai-chip${p.priority === 'URGENT' ? ' ai-chip--danger' : ''}`}>
                    {p.priority} · {p.count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Trend + keywords */}
          <div className="ai-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">📈</span> Daily Trend</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                {summary.dailyTrend.map((p) => (
                  <div key={p.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>{p.count > 0 ? p.count : ''}</span>
                    <div className="ai-bar" style={{ height: `${Math.max(4, (p.count / maxTrend) * 90)}px`, background: p.count > 0 ? '#7C3AED' : '#E2E8F0' }} />
                    <span style={{ fontSize: 9, color: '#CBD5E1', transform: 'rotate(-45deg)' }}>{p.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">🔑</span> Top Keywords</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {summary.topKeywords.map((k) => (
                  <span key={k.word} className="ai-chip">{k.word} · {k.count}</span>
                ))}
              </div>
              <div className="ai-section__label" style={{ marginTop: 20 }}><span className="ai-section__label-icon">💡</span> AI Insights</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {summary.insights.map((ins) => (
                  <div className="ai-insight" key={ins}>
                    <span className="ai-insight__icon">💡</span>
                    <div className="ai-insight__msg">{ins}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Urgent tickets */}
          <div className="ai-panel">
            <div className="ai-section__label"><span className="ai-section__label-icon">🚨</span> Urgent — Needs Immediate Attention</div>
            {summary.urgentTickets.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 13 }}>No urgent open tickets. Great job!</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {summary.urgentTickets.map((t) => (
                  <div key={t.id} className="ai-list-item" onClick={() => openDetail(t.id)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 14 }}>#{t.id} · {t.subject}</strong>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="ai-chip">{CATEGORY_EMOJI[t.category] || '📄'} {t.category}</span>
                        <span className="ai-chip" style={{ color: SENTIMENT_COLOR[t.sentiment] }}>{t.sentiment}</span>
                        <span className="ai-chip ai-chip--danger">{t.hoursOpen}h open</span>
                      </div>
                    </div>
                    <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>{t.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ticket detail */}
          {selectedId && (
            <div className="ai-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="ai-section__label" style={{ marginBottom: 0 }}>
                  <span className="ai-section__label-icon">🎫</span> Ticket #{selectedId} — AI Analysis
                </div>
                <button className="ai-error__retry" onClick={() => setSelectedId(null)}>Close</button>
              </div>
              {detailLoading ? (
                <div className="ai-loading" style={{ minHeight: 120 }}>
                  <div className="ai-loading__spinner" />
                  <p className="ai-loading__text">Analyzing ticket…</p>
                </div>
              ) : detail ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="ai-chip">{detail.status}</span>
                    <span className="ai-chip ai-chip--danger">{detail.priority}</span>
                    <span className="ai-chip">{CATEGORY_EMOJI[detail.category] || '📄'} {detail.category}</span>
                    <span className="ai-chip" style={{ color: SENTIMENT_COLOR[detail.sentiment] }}>{detail.sentiment} ({detail.score})</span>
                    <span className="ai-chip">{detail.hoursOpen}h open</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: 14 }}>{detail.subject}</strong>
                    <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 13, whiteSpace: 'pre-wrap' }}>{detail.description}</p>
                  </div>
                  {detail.keywords.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {detail.keywords.map((k) => <span key={k} className="ai-chip">{k}</span>)}
                    </div>
                  )}
                  <div className="ai-insight">
                    <span className="ai-insight__icon">🤖</span>
                    <div>
                      <strong style={{ fontSize: 13 }}>Suggested response:</strong>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>{detail.suggestedResponse}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94A3B8', fontSize: 13 }}>Could not load ticket detail.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
