/**
 * OperationsMapPage — Live Operations Map.
 *
 * Renders live rides, fleet availability and zone-level demand
 * hotspots on a self-contained, dependency-free map.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';
import '../styles/AiIntelligence.css';

interface LiveRide {
  id: number; status: string; driverName: string; pickupAddress: string; dropoffAddress: string;
  pickupLatitude: number; pickupLongitude: number; dropoffLatitude: number; dropoffLongitude: number;
}
interface AreaPoint { area: string; lat: number; lng: number; activeRides: number; completedToday: number; }
interface MapData {
  generatedAt: string; liveRides: number; onlineDrivers: number; totalDrivers: number; onlinePct: number;
  rides: LiveRide[]; areas: AreaPoint[]; insights: string[];
}

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: '#94A3B8',
  ACCEPTED: '#3B82F6',
  DRIVER_EN_ROUTE: '#8B5CF6',
  DRIVER_ARRIVED: '#F59E0B',
  IN_PROGRESS: '#22C55E',
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Requested',
  ACCEPTED: 'Accepted',
  DRIVER_EN_ROUTE: 'En route',
  DRIVER_ARRIVED: 'Arrived',
  IN_PROGRESS: 'In progress',
};

export default function OperationsMapPage() {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ type: string; name: string; detail: string; x: number; y: number } | null>(null);

  const fetchMap = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<MapData>('/ai/map');
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load live map.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMap();
    const t = setInterval(fetchMap, 15000);
    return () => clearInterval(t);
  }, [fetchMap]);

  const { dotRides, dotAreas, xOf, yOf } = useMemo(() => {
    if (!data) return { dotRides: [] as LiveRide[], dotAreas: [] as AreaPoint[], xOf: (_: number) => 50, yOf: (_: number) => 50 };
    const lats = [...data.areas.map((a) => a.lat), ...data.rides.map((r) => r.pickupLatitude), ...data.rides.map((r) => r.dropoffLatitude)];
    const lngs = [...data.areas.map((a) => a.lng), ...data.rides.map((r) => r.pickupLongitude), ...data.rides.map((r) => r.dropoffLongitude)];
    const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
    const pad = 0.06;
    const latR = Math.max(0.001, maxLat - minLat + pad * 2);
    const lngR = Math.max(0.001, maxLng - minLng + pad * 2);
    const xOf = (lng: number) => ((lng - (minLng - pad)) / lngR) * 100;
    const yOf = (lat: number) => ((maxLat + pad - lat) / latR) * 100;
    return { dotRides: data.rides, dotAreas: data.areas, xOf, yOf };
  }, [data]);

  const maxActive = Math.max(1, ...(data?.areas.map((a) => a.activeRides) ?? [0]));

  return (
    <div className="ai">
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__title-row">
            <h1>Live Operations Map</h1>
            <span className="ai-badge"><span className="ai-badge__dot" /> LIVE</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
            Real-time rides, fleet availability and demand hotspots across the city
          </p>
        </div>
        {data && (
          <div className="ai-header__right">
            <span className="ai-header__time">🕒 {data.generatedAt} · auto-refresh 15s</span>
            <button className="ai-header__refresh" onClick={fetchMap}>Refresh</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="ai-loading" style={{ minHeight: 220 }}>
          <div className="ai-loading__spinner" />
          <p className="ai-loading__text">Streaming live map…</p>
        </div>
      ) : error ? (
        <div className="ai-error">
          <div className="ai-error__icon">⚠️</div>
          <h3 className="ai-error__title">Map failed</h3>
          <p className="ai-error__msg">{error}</p>
          <button className="ai-error__retry" onClick={fetchMap}>Retry</button>
        </div>
      ) : data && (
        <>
          <div className="ai-grid ai-grid--4">
            <div className="ai-card ai-card--accent">
              <div className="ai-card__label">Live rides</div>
              <div className="ai-card__value">{data.liveRides}</div>
              <div className="ai-card__sub">active right now</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Drivers online</div>
              <div className="ai-card__value">{data.onlineDrivers}<span style={{ fontSize: 14, color: '#94A3B8' }}> / {data.totalDrivers}</span></div>
              <div className="ai-card__sub">fleet availability</div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Online %</div>
              <div className="ai-card__value">{data.onlinePct}%</div>
              <div className="ai-progress" style={{ marginTop: 8 }}>
                <div
                  className="ai-progress__fill"
                  style={{ width: `${Math.min(100, data.onlinePct)}%`, background: data.onlinePct >= 50 ? '#22C55E' : '#F59E0B' }}
                />
              </div>
            </div>
            <div className="ai-card">
              <div className="ai-card__label">Active zones</div>
              <div className="ai-card__value">{data.areas.filter((a) => a.activeRides > 0).length}</div>
              <div className="ai-card__sub">of {data.areas.length} city areas</div>
            </div>
          </div>

          <div className="ai-panel">
            <div className="ai-section__label" style={{ marginBottom: 10 }}>
              <span className="ai-section__label-icon">🗺️</span> City Map — Rides &amp; Demand
            </div>
            <div className="ai-map">
              {data.rides.map((r) => (
                <div
                  key={`ride-${r.id}`}
                  className="ai-map__dot ai-map__dot--ride"
                  style={{
                    left: `${xOf(r.pickupLongitude)}%`,
                    top: `${yOf(r.pickupLatitude)}%`,
                    background: STATUS_COLOR[r.status] ?? '#64748B',
                  }}
                  onMouseEnter={() =>
                    setHover({
                      type: 'ride', name: `Ride #${r.id} · ${STATUS_LABEL[r.status] ?? r.status}`,
                      detail: `${r.driverName} — ${r.pickupAddress} → ${r.dropoffAddress}`,
                      x: xOf(r.pickupLongitude), y: yOf(r.pickupLatitude),
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                />
              ))}
              {data.areas.map((a) => (
                <div key={`area-${a.area}`}>
                  <div
                    className="ai-map__dot ai-map__dot--area"
                    style={{
                      left: `${xOf(a.lng)}%`,
                      top: `${yOf(a.lat)}%`,
                      width: `${14 + (a.activeRides / maxActive) * 22}px`,
                      height: `${14 + (a.activeRides / maxActive) * 22}px`,
                      opacity: a.activeRides > 0 ? 1 : 0.35,
                    }}
                    onMouseEnter={() =>
                      setHover({
                        type: 'area', name: a.area,
                        detail: `${a.activeRides} active · ${a.completedToday} completed today`,
                        x: xOf(a.lng), y: yOf(a.lat),
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                  <div className="ai-map__label" style={{ left: `${xOf(a.lng)}%`, top: `${yOf(a.lat)}%` }}>
                    {a.area}
                  </div>
                </div>
              ))}
              {hover && (
                <div
                  className="ai-map__tooltip"
                  style={{
                    left: `${Math.max(6, Math.min(78, hover.x))}%`,
                    top: `${Math.max(8, hover.y - 12)}%`,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{hover.name}</div>
                  <div>{hover.detail}</div>
                </div>
              )}
            </div>
            <div className="ai-map__legend" style={{ marginTop: 12 }}>
              {Object.entries(STATUS_LABEL).map(([status, label]) => (
                <span key={status}>
                  <span className="ai-map__swatch" style={{ background: STATUS_COLOR[status] }} /> {label}
                </span>
              ))}
              <span><span className="ai-map__swatch" style={{ background: '#1E88E5', border: '2px solid #fff' }} /> Area hotspot</span>
            </div>
          </div>

          <div className="ai-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">🚕</span> Live Rides ({data.rides.length})</div>
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {data.rides.length === 0 ? (
                  <p style={{ color: '#94A3B8', fontSize: 13 }}>No active rides right now.</p>
                ) : (
                  data.rides.map((r) => (
                    <div className="ai-list-item" key={r.id}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Ride #{r.id} · {STATUS_LABEL[r.status] ?? r.status}</div>
                        <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
                          {r.driverName} — {r.pickupAddress}
                        </div>
                      </div>
                      <span className="ai-map__swatch" style={{ background: STATUS_COLOR[r.status] ?? '#64748B' }} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="ai-panel">
              <div className="ai-section__label"><span className="ai-section__label-icon">💡</span> Operations Insights</div>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {data.insights.map((ins) => (
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
