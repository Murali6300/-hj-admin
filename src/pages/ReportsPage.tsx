/**
 * ReportsPage — AI Smart Reports.
 *
 * Six report types (Revenue, Driver Performance, Passenger Activity,
 * Payments, Ride Analytics, Complaints) with period selection and
 * one-click export to Excel (CSV) or PDF.
 */

import { useState, useCallback, useEffect } from 'react';
import api from '../api';
import '../styles/AiIntelligence.css';

/* ── Types ────────────────────────────────────────────────────── */

interface SmartReport {
  type: string;
  title: string;
  period: string;
  generatedAt: string;
  summary: Record<string, string>;
  columns: string[];
  rows: string[][];
  insights: string[];
}

const REPORT_TYPES: { key: string; label: string; icon: string }[] = [
  { key: 'REVENUE', label: 'Revenue', icon: '💰' },
  { key: 'DRIVER_PERFORMANCE', label: 'Driver Performance', icon: '🚖' },
  { key: 'PASSENGER_ACTIVITY', label: 'Passenger Activity', icon: '👥' },
  { key: 'PAYMENTS', label: 'Payments', icon: '💳' },
  { key: 'RIDE_ANALYTICS', label: 'Ride Analytics', icon: '🚕' },
  { key: 'COMPLAINTS', label: 'Complaints', icon: '🎫' },
];

const RANGES: { label: string; days: number }[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

function dateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Component ────────────────────────────────────────────────── */

export default function ReportsPage() {
  const [type, setType] = useState('REVENUE');
  const [rangeDays, setRangeDays] = useState(30);
  const [from, setFrom] = useState(dateStr(-30));
  const [to, setTo] = useState(dateStr(0));
  const [report, setReport] = useState<SmartReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickRange = (days: number) => {
    setRangeDays(days);
    setFrom(dateStr(-days));
    setTo(dateStr(0));
  };

  const fetchReport = useCallback(async (t: string, f: string, tt: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SmartReport>('/reports/smart', {
        params: { type: t, from: f, to: tt },
      });
      setReport(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(type, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = () => fetchReport(type, from, to);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const res = await api.get('/reports/smart/export', {
        params: { type, from, to, format },
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      const mime = format === 'pdf' ? 'application/pdf' : 'text/csv';
      const fixed = new Blob([blob], { type: mime });
      downloadBlob(fixed, `smart-report-${type.toLowerCase()}-${dateStr(0)}.${ext}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const typeMeta = REPORT_TYPES.find((t) => t.key === type) || REPORT_TYPES[0];

  return (
    <div className="ai">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Smart Reports</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> INSTANT</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Generate any report in one click and export to Excel or PDF
          </p>
        </div>
      </div>

      {/* ── Controls ────────────────────────────────────── */}
      <div className="ai-panel">
        <div className="ai-section__label" style={{ marginBottom: 10 }}>
          <span className="ai-section__label-icon">📄</span> Report Type
        </div>
        <div className="ai-tabs" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          {REPORT_TYPES.map((t) => (
            <button
              key={t.key}
              className={`ai-tabs__btn${type === t.key ? ' ai-tabs__btn--active' : ''}`}
              onClick={() => setType(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="ai-section__label" style={{ marginBottom: 10 }}>
          <span className="ai-section__label-icon">🗓️</span> Period
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13 }}
          />
          <span style={{ color: '#64748B', fontSize: 13 }}>→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13 }}
          />
          <button className="ai-error__retry" onClick={handleGenerate} disabled={loading}>
            Generate
          </button>
          <button
            className="ai-header__refresh"
            onClick={() => handleExport('excel')}
            disabled={exporting || !report}
          >
            📊 Export Excel
          </button>
          <button
            className="ai-header__refresh"
            onClick={() => handleExport('pdf')}
            disabled={exporting || !report}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────── */}
      {loading && (
        <div className="ai-loading" style={{ minHeight: 220 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Generating {typeMeta.label} report…</p>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────── */}
      {error && !loading && (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Report failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={handleGenerate}>Retry</button>
        </div>
      )}

      {/* ── Report ──────────────────────────────────────── */}
      {report && !loading && (
        <>
          <div className="ai-section">
            <div className="ai-section__label">
              <span className="ai-section__label-icon">{typeMeta.icon}</span> {report.title}
              <span className="ai-header__time"> {report.period} · generated {report.generatedAt}</span>
            </div>

            <div className="ai-grid">
              {Object.entries(report.summary).map(([k, v]) => (
                <div className="ai-card" key={k}>
                  <div className="ai-card__label">{k}</div>
                  <div className="ai-card__value" style={{ fontSize: 20 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="ai-section">
            <div className="ai-section__label">
              <span className="ai-section__label-icon">📊</span> Details
            </div>
            <div className="ai-table-wrap">
              <table className="ai-table">
                <thead>
                  <tr>
                    {report.columns.map((c) => <th key={c}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, ci) => (
                        <td key={ci} className={ci === 0 ? 'ai-table__cell-main' : ''}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ai-section">
            <div className="ai-section__label">
              <span className="ai-section__label-icon">🧠</span> AI Insights
            </div>
            <div className="ai-grid">
              {report.insights.map((insight) => (
                <div className="ai-insight" key={insight}>
                  <span className="ai-insight__icon">💡</span>
                  <div className="ai-insight__msg">{insight}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
