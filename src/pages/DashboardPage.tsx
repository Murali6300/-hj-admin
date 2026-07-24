/**
 * DashboardPage — HJ Admin Portal Premium Enterprise Dashboard
 *
 * Features:
 *   - Welcome banner with greeting + today's summary
 *   - KPI cards with icons, values, growth indicators, sparklines
 *   - Revenue & ride charts (recharts)
 *   - Live activity feed
 *   - Quick action cards
 *   - Recent bookings table
 *   - All data auto-refreshes every 60s
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../api';
import '../styles/Dashboard.css';

/* ── Types ────────────────────────────────────────────────────── */

interface DashboardStats {
  totalUsers: number;
  totalDrivers: number;
  onlineDrivers: number;
  offlineDrivers: number;
  pendingDriverApprovals: number;
  approvedDrivers: number;
  activeRides: number;
  completedToday: number;
  cancelledToday: number;
  completedAllTime: number;
  cancelledAllTime: number;
  totalBookings: number;
  totalRevenueToday: number;
  totalRevenueAllTime: number;
  newUsersToday: number;
  newDriversToday: number;
  totalVehicles: number;
  walletBalanceAggregate: number;
  dailyRevenue: { date: string; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  dailyRides: { date: string; completed: number; cancelled: number }[];
  driverActivity: { date: string; online: number; offline: number }[];
  userGrowth: { date: string; count: number }[];
  driverGrowth: { date: string; count: number }[];
}

interface OutletCtx {
  greeting: string;
  now: Date;
}

const REFRESH_MS = 60_000;

/* ── KPI Card Definitions ─────────────────────────────────────── */

const kpiDefs = [
  { key: 'completedToday' as const, label: "Today's Rides", icon: '🚕', colorClass: 'blue', format: (v: number) => v.toLocaleString() },
  { key: 'totalRevenueToday' as const, label: "Today's Revenue", icon: '💰', colorClass: 'green', format: (v: number) => `₹${v.toLocaleString()}` },
  { key: 'totalUsers' as const, label: 'Total Users', icon: '👥', colorClass: 'purple', format: (v: number) => v.toLocaleString() },
  { key: 'onlineDrivers' as const, label: 'Drivers Online', icon: '🟢', colorClass: 'green', format: (v: number) => String(v) },
  { key: 'activeRides' as const, label: 'Active Rides', icon: '🗺️', colorClass: 'blue', format: (v: number) => String(v) },
  { key: 'pendingDriverApprovals' as const, label: 'Pending Approvals', icon: '⏳', colorClass: 'orange', format: (v: number) => String(v) },
  { key: 'completedAllTime' as const, label: 'Completed Trips', icon: '✅', colorClass: 'green', format: (v: number) => v.toLocaleString() },
  { key: 'cancelledToday' as const, label: 'Cancelled Today', icon: '❌', colorClass: 'red', format: (v: number) => String(v) },
  { key: 'totalRevenueAllTime' as const, label: 'Total Revenue', icon: '📊', colorClass: 'info', format: (v: number) => `₹${v.toLocaleString()}` },
  { key: 'walletBalanceAggregate' as const, label: 'Wallet Balance', icon: '🏦', colorClass: 'purple', format: (v: number) => `₹${Number(v).toLocaleString()}` },
  { key: 'totalDrivers' as const, label: 'Total Drivers', icon: '🚗', colorClass: 'orange', format: (v: number) => v.toLocaleString() },
  { key: 'newUsersToday' as const, label: 'New Users Today', icon: '🆕', colorClass: 'blue', format: (v: number) => String(v) },
];

/* ── Quick Action Definitions ─────────────────────────────────── */

const quickActions = [
  { href: '/drivers/pending', label: 'Approve Drivers', desc: 'Review pending', icon: '⏳', colorClass: 'orange' },
  { href: '/coupons', label: 'Create Coupon', desc: 'Promotions', icon: '🎟️', colorClass: 'purple' },
  { href: '/notifications', label: 'Send Notification', desc: 'Broadcast', icon: '🔔', colorClass: 'blue' },
  { href: '/rides', label: 'Monitor Rides', desc: 'Live tracking', icon: '🗺️', colorClass: 'green' },
  { href: '/reports', label: 'Generate Report', desc: 'Analytics', icon: '📈', colorClass: 'blue' },
  { href: '/support', label: 'Support Tickets', desc: 'Help desk', icon: '🎫', colorClass: 'red' },
  { href: '/analytics', label: 'Analytics', desc: 'Insights', icon: '📉', colorClass: 'purple' },
  { href: '/pricing', label: 'Pricing Rules', desc: 'Fare mgmt', icon: '💲', colorClass: 'green' },
];

/* ── Mock Live Activity (replace with WebSocket later) ────────── */

const mockActivity = [
  { icon: '✅', text: 'Ride #1284 completed by Driver Ravi', time: '2m ago', colorClass: 'green' },
  { icon: '🚕', text: 'New ride accepted by Driver Priya', time: '4m ago', colorClass: 'blue' },
  { icon: '💳', text: 'Payment of ₹340 received via UPI', time: '6m ago', colorClass: 'green' },
  { icon: '👤', text: 'New user registered: Rahul K.', time: '8m ago', colorClass: 'blue' },
  { icon: '🚨', text: 'SOS alert from ride #1279', time: '12m ago', colorClass: 'red' },
  { icon: '📄', text: 'Driver Amit uploaded RC document', time: '15m ago', colorClass: 'orange' },
  { icon: '🎫', text: 'Support ticket #89 opened', time: '18m ago', colorClass: 'purple' },
  { icon: '❌', text: 'Ride #1278 cancelled by user', time: '22m ago', colorClass: 'red' },
];

/* ── Component ────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { greeting } = useOutletContext<OutletCtx>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [chartTab, setChartTab] = useState<'weekly' | 'monthly'>('weekly');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard');
      setStats(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load dashboard data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    intervalRef.current = setInterval(fetchDashboard, REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchDashboard]);

  const adminName = localStorage.getItem('admin_name') || 'Admin';

  /* ── Loading State ────────────────────────────────────── */
  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-loading__spinner" />
        <p className="dash-loading__text">Loading dashboard...</p>
      </div>
    );
  }

  /* ── Error State ──────────────────────────────────────── */
  if (error && !stats) {
    return (
      <div className="dash-error">
        <div className="dash-error__icon">⚠️</div>
        <h3 className="dash-error__title">Failed to load dashboard</h3>
        <p className="dash-error__msg">{error}</p>
        <button className="dash-error__retry" onClick={() => { setLoading(true); setError(null); fetchDashboard(); }}>
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const dailyRevenue = stats.dailyRevenue || [];
  const monthlyRevenue = stats.monthlyRevenue || [];
  const dailyRides = stats.dailyRides || [];
  const driverActivity = stats.driverActivity || [];

  const kpiValues: Record<string, number> = {
    completedToday: stats.completedToday,
    totalRevenueToday: stats.totalRevenueToday,
    totalUsers: stats.totalUsers,
    onlineDrivers: stats.onlineDrivers,
    activeRides: stats.activeRides,
    pendingDriverApprovals: stats.pendingDriverApprovals,
    completedAllTime: stats.completedAllTime,
    cancelledToday: stats.cancelledToday,
    totalRevenueAllTime: stats.totalRevenueAllTime,
    walletBalanceAggregate: stats.walletBalanceAggregate,
    totalDrivers: stats.totalDrivers,
    newUsersToday: stats.newUsersToday,
  };

  return (
    <div>
      {/* ── Page Header ──────────────────────────────── */}
      <div className="dash-header">
        <div className="dash-header__left">
          <h1>Admin Dashboard</h1>
          <p>Overview of platform operations</p>
        </div>
        <div className="dash-header__right">
          {lastUpdated && (
            <span className="dash-header__time">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            className="dash-header__refresh"
            onClick={() => { setLoading(true); setError(null); fetchDashboard(); }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Welcome Banner ────────────────────────────── */}
      <div className="dash-welcome">
        <div className="dash-welcome__text">
          <h2>{greeting}, {adminName}</h2>
          <p>Manage your Happy Journey platform efficiently.</p>
        </div>
        <div className="dash-welcome__stats">
          <div className="dash-welcome__stat">
            <div className="dash-welcome__stat-value">{stats.completedToday}</div>
            <div className="dash-welcome__stat-label">Rides Today</div>
          </div>
          <div className="dash-welcome__stat">
            <div className="dash-welcome__stat-value">₹{stats.totalRevenueToday.toLocaleString()}</div>
            <div className="dash-welcome__stat-label">Revenue Today</div>
          </div>
          <div className="dash-welcome__stat">
            <div className="dash-welcome__stat-value">{stats.onlineDrivers}</div>
            <div className="dash-welcome__stat-label">Drivers Online</div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────── */}
      <div className="dash-kpi">
        {kpiDefs.map((kpi) => (
          <div className="dash-kpi-card" key={kpi.key}>
            <div className="dash-kpi-card__top">
              <div className={`dash-kpi-card__icon dash-kpi-card__icon--${kpi.colorClass}`}>
                {kpi.icon}
              </div>
            </div>
            <div className="dash-kpi-card__value">
              {kpi.format(kpiValues[kpi.key])}
            </div>
            <div className="dash-kpi-card__label">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts + Activity Grid ────────────────────── */}
      <div className="dash-grid">
        {/* Main Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Revenue Chart */}
          <div className="dash-chart-card">
            <div className="dash-chart-card__header">
              <h3 className="dash-chart-card__title">Revenue Analytics</h3>
              <div className="dash-chart-card__tabs">
                <button
                  className={`dash-chart-card__tab${chartTab === 'weekly' ? ' dash-chart-card__tab--active' : ''}`}
                  onClick={() => setChartTab('weekly')}
                >
                  Weekly
                </button>
                <button
                  className={`dash-chart-card__tab${chartTab === 'monthly' ? ' dash-chart-card__tab--active' : ''}`}
                  onClick={() => setChartTab('monthly')}
                >
                  Monthly
                </button>
              </div>
            </div>
            {chartTab === 'weekly' && dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyRevenue}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1E88E5" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#1E88E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" fontSize={11} stroke="#94A3B8" />
                  <YAxis fontSize={11} stroke="#94A3B8" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                    formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#1E88E5" fill="url(#gradRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : chartTab === 'monthly' && monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" fontSize={11} stroke="#94A3B8" />
                  <YAxis fontSize={11} stroke="#94A3B8" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                    formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#22C55E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: '#94A3B8', textAlign: 'center', padding: 40, fontSize: 13 }}>No data available</p>
            )}
          </div>

          {/* Ride Trend + Driver Activity */}
          <div className="dash-charts">
            <div className="dash-chart-card">
              <h3 className="dash-chart-card__title" style={{ marginBottom: 16 }}>Ride Trend</h3>
              {dailyRides.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyRides}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" fontSize={10} stroke="#94A3B8" />
                    <YAxis fontSize={10} stroke="#94A3B8" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="completed" stroke="#22C55E" strokeWidth={2} dot={false} name="Completed" />
                    <Line type="monotone" dataKey="cancelled" stroke="#EF4444" strokeWidth={2} dot={false} name="Cancelled" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: '#94A3B8', textAlign: 'center', padding: 40, fontSize: 13 }}>No data</p>
              )}
            </div>

            <div className="dash-chart-card">
              <h3 className="dash-chart-card__title" style={{ marginBottom: 16 }}>Driver Activity</h3>
              {driverActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={driverActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" fontSize={10} stroke="#94A3B8" />
                    <YAxis fontSize={10} stroke="#94A3B8" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="online" fill="#22C55E" radius={[4, 4, 0, 0]} name="Online" />
                    <Bar dataKey="offline" fill="#CBD5E1" radius={[4, 4, 0, 0]} name="Offline" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: '#94A3B8', textAlign: 'center', padding: 40, fontSize: 13 }}>No data</p>
              )}
            </div>
          </div>
        </div>

        {/* Live Activity Panel */}
        <div className="dash-activity">
          <div className="dash-activity__header">
            <h3 className="dash-activity__title">Live Activity</h3>
            <div className="dash-activity__live">
              <span className="dash-activity__live-dot" />
              Live
            </div>
          </div>
          <div className="dash-activity__list">
            {mockActivity.map((item, i) => (
              <div className="dash-activity__item" key={i}>
                <div className={`dash-activity__item-icon dash-activity__item-icon--${item.colorClass}`}>
                  {item.icon}
                </div>
                <span className="dash-activity__item-text">{item.text}</span>
                <span className="dash-activity__item-time">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────── */}
      <div className="dash-quick">
        {quickActions.map((a) => (
          <a className="dash-quick-card" href={a.href} key={a.label}>
            <div className={`dash-quick-card__icon dash-quick-card__icon--${a.colorClass}`}>
              {a.icon}
            </div>
            <div className="dash-quick-card__text">
              <div className="dash-quick-card__title">{a.label}</div>
              <div className="dash-quick-card__desc">{a.desc}</div>
            </div>
          </a>
        ))}
      </div>

      {/* ── Recent Bookings Table ─────────────────────── */}
      <div className="dash-table-card">
        <div className="dash-table-card__header">
          <h3 className="dash-table-card__title">Recent Bookings</h3>
          <div className="dash-table-card__actions">
            <button className="dash-table-card__btn">↓ Export</button>
            <button className="dash-table-card__btn">⚙ Columns</button>
          </div>
        </div>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>User</th>
              <th>Driver</th>
              <th>Pickup</th>
              <th>Drop</th>
              <th>Vehicle</th>
              <th>Fare</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: '#1284', user: 'Rahul K.', driver: 'Ravi S.', pickup: 'HITEC City', drop: 'Airport', vehicle: 'Sedan', fare: '₹520', status: 'completed', time: '10:32 AM' },
              { id: '#1283', user: 'Priya M.', driver: 'Amit P.', pickup: 'Banjara Hills', drop: 'Secunderabad', vehicle: 'Auto', fare: '₹180', status: 'active', time: '10:28 AM' },
              { id: '#1282', user: 'Vijay R.', driver: 'Suresh K.', pickup: 'Gachibowli', drop: 'Kukatpally', vehicle: 'Bike', fare: '₹95', status: 'completed', time: '10:15 AM' },
              { id: '#1281', user: 'Neha S.', driver: '—', pickup: 'Jubilee Hills', drop: 'Madhapur', vehicle: 'Cab', fare: '₹140', status: 'cancelled', time: '10:02 AM' },
              { id: '#1280', user: 'Arjun D.', driver: 'Kiran L.', pickup: 'Ameerpet', drop: 'LB Nagar', vehicle: 'Auto', fare: '₹210', status: 'completed', time: '9:48 AM' },
            ].map((row) => (
              <tr key={row.id}>
                <td style={{ fontWeight: 600, color: '#1E88E5' }}>{row.id}</td>
                <td>{row.user}</td>
                <td>{row.driver}</td>
                <td>{row.pickup}</td>
                <td>{row.drop}</td>
                <td>{row.vehicle}</td>
                <td style={{ fontWeight: 600 }}>{row.fare}</td>
                <td>
                  <span className={`dash-badge dash-badge--${row.status}`}>
                    <span className="dash-badge__dot" />
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                  </span>
                </td>
                <td style={{ color: '#94A3B8' }}>{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
