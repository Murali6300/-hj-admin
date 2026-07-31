/**
 * SearchPage — AI natural-language search.
 *
 * Results come from /api/v1/admin/search and are grouped by entity type
 * with navigation hints. The query is read from the URL (?q=) so the
 * header search box can deep-link here.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { hasPermission, type Permission } from '../utils/adminPermissions';
import '../styles/AiIntelligence.css';

/* ── Types ────────────────────────────────────────────────────── */

interface SearchResult {
  id: number;
  title: string;
  subtitle: string;
  meta: string;
}

interface SearchGroup {
  key: string;
  label: string;
  icon: string;
  route: string | null;
  permission: string | null;
  results: SearchResult[];
}

interface SearchResponse {
  query: string;
  generatedAt: string;
  total: number;
  groups: SearchGroup[];
}

const SUGGESTIONS = [
  'Driver with phone ending 1234',
  'Rides cancelled today',
  'Payments above 1000',
  'Pending KYC',
  'Failed payments',
  'Active rides',
  'Online drivers',
  'Inactive drivers',
  'Driver Rahul',
  'User Priya',
];

/* ── Component ────────────────────────────────────────────────── */

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [input, setInput] = useState(initialQuery);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SearchResponse>('/search', { params: { q } });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Search failed.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) runSearch(initialQuery);
    else setLoading(false);
  }, [initialQuery, runSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const goTo = (group: SearchGroup) => {
    if (!group.route || !group.permission) return;
    if (hasPermission(group.permission as Permission)) {
      navigate(group.route);
    }
  };

  return (
    <div className="ai">
      {/* ── Header + search box ─────────────────────────── */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>AI Search</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> NATURAL LANGUAGE</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Find drivers, users, rides and payments with plain English
          </p>
        </div>
      </div>

      <form className="ai-search-form" onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
        <input
          ref={inputRef}
          className="ai-search-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try "driver with phone ending 1234" or "rides cancelled today"'
          autoFocus
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          className="ai-error__retry"
          style={{ padding: '0 24px', borderRadius: 12 }}
        >
          Search
        </button>
      </form>

      {/* ── Suggestions ─────────────────────────────────── */}
      {!query && (
        <div className="ai-section">
          <div className="ai-section__label">
            <span className="ai-section__label-icon">💡</span> Try one of these
          </div>
          <div className="ai-factors" style={{ marginTop: 0 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="ai-factor"
                onClick={() => { setInput(s); navigate(`/search?q=${encodeURIComponent(s)}`); }}
                style={{ border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', padding: '8px 14px', fontSize: 12.5 }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────── */}
      {loading && (
        <div className="ai-loading" style={{ minHeight: 200 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Searching drivers, users, rides &amp; payments…</p>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────── */}
      {error && !loading && (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Search failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={() => runSearch(query)}>Retry</button>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────── */}
      {data && !loading && (
        <>
          <div className="ai-section__label" style={{ fontSize: 13 }}>
            <span className="ai-section__label-icon">🔍</span>
            {data.total} result{data.total !== 1 ? 's' : ''} for “{data.query}”
          </div>

          {data.groups.map((group) => (
            <div className="ai-section" key={group.key}>
              <div className="ai-section__label">
                <span className="ai-section__label-icon">{group.icon || '▪️'}</span> {group.label}
                {group.route && group.permission && hasPermission(group.permission as Permission) && (
                  <button
                    className="ai-factor"
                    onClick={() => goTo(group)}
                    style={{ border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}
                  >
                    Open {group.route.replace('/', '')} →
                  </button>
                )}
              </div>
              {group.results.length === 0 ? (
                <div className="ai-empty" style={{ padding: '20px 12px' }}>
                  <div className="ai-empty__text">No matches in this group</div>
                </div>
              ) : (
                <div className="ai-table-wrap">
                  <table className="ai-table">
                    <tbody>
                      {group.results.map((r) => (
                        <tr
                          key={`${group.key}-${r.id}`}
                          style={{ cursor: group.route ? 'pointer' : 'default' }}
                          onClick={() => goTo(group)}
                        >
                          <td>
                            <div className="ai-table__cell-main">{r.title}</div>
                            <div className="ai-table__cell-muted">{r.subtitle}</div>
                          </td>
                          <td className="ai-table__cell-muted" style={{ textAlign: 'right' }}>{r.meta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
