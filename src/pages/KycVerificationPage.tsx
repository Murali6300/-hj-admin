/**
 * KycVerificationPage — AI KYC Verification.
 *
 * Analyzes each driver's document set (DL, RC, Aadhaar, selfie, vehicle
 * photos, insurance) for completeness and expiry, then recommends
 * APPROVE / RESUBMISSION / REJECT with a confidence score.
 */

import { useState, useEffect } from 'react';
import api from '../api';
import '../styles/AiIntelligence.css';

interface KycDriver {
  driverId: number; name: string; phoneNumber: string | null; vehicleNumber: string | null;
  vehicleType: string | null; status: string; docsPresent: number; docsRequired: number;
  completeness: number; recommendation: string; issues: string[]; confidence: number;
}
interface Summary {
  pending: number; readyToApprove: number; needsResubmission: number; rejected: number;
  expiredDocs: number; avgCompleteness: number; insights: string[]; drivers: KycDriver[];
}
interface DocCheck { document: string; present: boolean; note: string; }
interface Detail {
  driverId: number; name: string; phoneNumber: string | null; email: string | null;
  vehicleNumber: string | null; vehicleType: string | null; city: string | null;
  verificationStatus: string; docsPresent: number; docsRequired: number; completeness: number;
  recommendation: string; confidence: number; summary: string; checks: DocCheck[]; issues: string[];
}

const REC_COLOR: Record<string, string> = {
  APPROVE: '#22C55E',
  RESUBMISSION: '#F59E0B',
  REJECT: '#EF4444',
};
const REC_BG: Record<string, string> = {
  APPROVE: '#F0FDF4',
  RESUBMISSION: '#FFFBEB',
  REJECT: '#FEF2F2',
};

export default function KycVerificationPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Summary>('/ai/kyc');
      setSummary(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load KYC queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const openDetail = async (driverId: number) => {
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.get<Detail>(`/ai/kyc/${driverId}`);
      setDetail(res.data);
    } catch { setDetail(null); } finally { setDetailLoading(false); }
  };

  return (
    <div className="ai">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI KYC Verification</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> DOCUMENT AI</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Auto-checks driver documents for completeness and expiry, and recommends the next action
          </p>
        </div>
      </div>

      {loading ? (
        <div className="ai-loading" style={{ minHeight: 220 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Analyzing document queue…</p>
        </div>
      ) : error ? (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Analysis failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={fetchQueue}>Retry</button>
        </div>
      ) : summary && (
        <>
          {/* Summary cards */}
          <div className="ai-grid">
            <div className="ai-card"><div className="ai-card__label">Pending Queue</div><div className="ai-card__value">{summary.pending}</div></div>
            <div className="ai-card"><div className="ai-card__label">Ready to Approve</div><div className="ai-card__value" style={{ color: '#22C55E' }}>{summary.readyToApprove}</div></div>
            <div className="ai-card"><div className="ai-card__label">Need Re-submission</div><div className="ai-card__value" style={{ color: '#F59E0B' }}>{summary.needsResubmission}</div></div>
            <div className="ai-card"><div className="ai-card__label">Rejected</div><div className="ai-card__value" style={{ color: '#EF4444' }}>{summary.rejected}</div></div>
            <div className="ai-card"><div className="ai-card__label">Expired Docs</div><div className="ai-card__value" style={{ color: '#EF4444' }}>{summary.expiredDocs}</div></div>
            <div className="ai-card"><div className="ai-card__label">Avg Completeness</div><div className="ai-card__value">{summary.avgCompleteness}%</div></div>
          </div>

          {/* Insights */}
          <div className="ai-section">
            <div className="ai-section__label"><span className="ai-section__label-icon">💡</span> AI Insights</div>
            <div className="ai-grid">
              {summary.insights.map((ins) => (
                <div className="ai-insight" key={ins}>
                  <span className="ai-insight__icon">💡</span>
                  <div className="ai-insight__msg">{ins}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue */}
          <div className="ai-section">
            <div className="ai-section__label">
              <span className="ai-section__label-icon">🪪</span> Driver Document Queue
              <span className="ai-header__time"> {summary.drivers.length} awaiting verification</span>
            </div>
            {summary.drivers.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 13 }}>The KYC queue is clear. 🎉</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {summary.drivers.map((d) => (
                  <div key={d.driverId} className="ai-list-item" onClick={() => openDetail(d.driverId)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>{d.name}</strong>
                        <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
                          {d.phoneNumber || '—'} · {d.vehicleType || '—'} · {d.vehicleNumber || '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#64748B' }}>
                          {d.docsPresent}/{d.docsRequired} docs · {d.completeness}%
                        </span>
                        <span className="ai-chip" style={{ background: REC_BG[d.recommendation] || '#F1F5F9', color: REC_COLOR[d.recommendation] || '#0F172A' }}>
                          {d.recommendation}
                        </span>
                        <span className="ai-chip" title="Confidence">{Math.round(d.confidence * 100)}%</span>
                      </div>
                    </div>
                    <div className="ai-progress" style={{ marginTop: 10 }}>
                      <div
                        className="ai-progress__fill"
                        style={{ width: `${d.completeness}%`, background: d.completeness >= 100 ? '#22C55E' : d.completeness >= 66 ? '#F59E0B' : '#EF4444' }}
                      />
                    </div>
                    {d.issues.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#B45309' }}>
                        {d.issues.slice(0, 3).map((i) => <div key={i}>• {i}</div>)}
                        {d.issues.length > 3 && <div>• +{d.issues.length - 3} more</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail */}
          {detail && (
            <div className="ai-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="ai-section__label" style={{ marginBottom: 0 }}>
                  <span className="ai-section__label-icon">🔍</span> {detail.name} — AI Analysis
                </div>
                <button className="ai-error__retry" onClick={() => setDetail(null)}>Close</button>
              </div>
              {detailLoading ? (
                <div className="ai-loading" style={{ minHeight: 120 }}>
                  <div className="ai-loading__spinner" />
                  <p className="ai-loading__text">Analyzing documents…</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div className="ai-insight">
                    <span className="ai-insight__icon">🤖</span>
                    <div>
                      <strong style={{ fontSize: 13 }}>
                        Recommendation: <span style={{ color: REC_COLOR[detail.recommendation] || '#0F172A' }}>{detail.recommendation}</span>
                        {' '}· confidence {Math.round(detail.confidence * 100)}%
                      </strong>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>{detail.summary}</p>
                    </div>
                  </div>

                  <div className="ai-table-wrap">
                    <table className="ai-table">
                      <thead>
                        <tr><th>Document</th><th>Status</th><th>Note</th></tr>
                      </thead>
                      <tbody>
                        {detail.checks.map((c) => (
                          <tr key={c.document}>
                            <td className="ai-table__cell-main">{c.document}</td>
                            <td>
                              <span className="ai-chip" style={{ background: c.present ? '#F0FDF4' : '#FEF2F2', color: c.present ? '#15803D' : '#B91C1C' }}>
                                {c.present ? '✓ Present' : '✗ Missing'}
                              </span>
                            </td>
                            <td style={{ color: '#64748B', fontSize: 13 }}>{c.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {detail.issues.length > 0 && (
                    <div>
                      <div className="ai-section__label" style={{ marginBottom: 8 }}><span className="ai-section__label-icon">⚠️</span> Issues</div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {detail.issues.map((i) => <div key={i} style={{ fontSize: 13, color: '#B45309' }}>• {i}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
