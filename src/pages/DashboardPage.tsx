import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import api from '../api';

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

const REFRESH_INTERVAL_MS = 60000;

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard');
      setStats(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Dashboard fetch failed:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to load dashboard data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    intervalRef.current = setInterval(fetchDashboard, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <p style={{ color: '#757575', fontSize: 14 }}>Loading dashboard...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: '#F44336', fontSize: 16, marginBottom: 12 }}>Failed to load dashboard data</p>
        <p style={{ color: '#757575', fontSize: 13, marginBottom: 20 }}>{error}</p>
        <button
          onClick={() => { setLoading(true); setError(null); fetchDashboard(); }}
          style={{ padding: '10px 24px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  // Defensive: ensure chart arrays always exist
  const dailyRevenue = stats.dailyRevenue || [];
  const monthlyRevenue = stats.monthlyRevenue || [];
  const dailyRides = stats.dailyRides || [];
  const driverActivity = stats.driverActivity || [];
  const userGrowth = stats.userGrowth || [];
  const driverGrowth = stats.driverGrowth || [];

  const cards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), color: '#9C27B0', icon: '\u{1F465}' },
    { label: 'Total Drivers', value: stats.totalDrivers.toLocaleString(), color: '#FF6D00', icon: '\u{1F697}' },
    { label: 'Online Drivers', value: String(stats.onlineDrivers), color: '#4CAF50', icon: '\u{1F7E2}' },
    { label: 'Offline Drivers', value: String(stats.offlineDrivers), color: '#9E9E9E', icon: '\u{1F534}' },
    { label: 'Pending Verifications', value: String(stats.pendingDriverApprovals), color: '#FF9800', icon: '\u23F3' },
    { label: 'Approved Drivers', value: String(stats.approvedDrivers), color: '#4CAF50', icon: '\u2705' },
    { label: 'Active Rides', value: String(stats.activeRides), color: '#1A73E8', icon: '\u{1F5FA}' },
    { label: 'Completed Rides', value: stats.completedAllTime.toLocaleString(), color: '#00BCD4', icon: '\u2705' },
    { label: 'Cancelled Rides', value: stats.cancelledAllTime.toLocaleString(), color: '#F44336', icon: '\u274C' },
    { label: 'Total Bookings', value: stats.totalBookings.toLocaleString(), color: '#3F51B5', icon: '\u{1F4CB}' },
    { label: 'Total Revenue', value: `\u20B9${stats.totalRevenueAllTime.toLocaleString()}`, color: '#1A73E8', icon: '\u{1F4B0}' },
    { label: 'Wallet Balance', value: `\u20B9${Number(stats.walletBalanceAggregate).toLocaleString()}`, color: '#673AB7', icon: '\u{1F3E6}' },
    { label: 'New Users Today', value: String(stats.newUsersToday), color: '#E91E63', icon: '\u{1F195}' },
    { label: 'New Drivers Today', value: String(stats.newDriversToday), color: '#FF5722', icon: '\u{1F195}' },
    { label: 'Total Vehicles', value: String(stats.totalVehicles), color: '#795548', icon: '\u{1F6FB}' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Admin Dashboard</h1>
          <p style={{ color: '#757575', fontSize: 14 }}>Overview of platform operations</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdated && (
            <span style={{ color: '#9E9E9E', fontSize: 12 }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); setError(null); fetchDashboard(); }}
            style={{ padding: '6px 16px', background: '#E3F2FD', color: '#1A73E8', border: '1px solid #BBDEFB', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 12, padding: 18, borderTop: `3px solid ${card.color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#757575', lineHeight: 1.4 }}>{card.label}</span>
              <span style={{ fontSize: 18 }}>{card.icon}</span>
            </div>
            <p style={{ fontSize: 26, fontWeight: 700, color: card.color, marginBottom: 2 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Today Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, color: '#333' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <a href="/drivers/pending" style={{ padding: 12, background: '#FFF3E0', borderRadius: 8, textDecoration: 'none', color: '#E65100', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
              Review Pending Drivers ({stats.pendingDriverApprovals})
            </a>
            <a href="/rides" style={{ padding: 12, background: '#E3F2FD', borderRadius: 8, textDecoration: 'none', color: '#1565C0', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
              Monitor Active Rides ({stats.activeRides})
            </a>
            <a href="/sos" style={{ padding: 12, background: '#FFEBEE', borderRadius: 8, textDecoration: 'none', color: '#C62828', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
              Check SOS Alerts
            </a>
            <a href="/support" style={{ padding: 12, background: '#F3E5F5', borderRadius: 8, textDecoration: 'none', color: '#880E4F', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
              View Support Tickets
            </a>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, color: '#333' }}>Today's Summary</h3>
          <div style={{ fontSize: 14, lineHeight: 2.2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#757575' }}>Revenue</span>
              <strong>\u20B9{stats.totalRevenueToday.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#757575' }}>Completed Rides</span>
              <strong>{stats.completedToday}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#757575' }}>Cancelled Rides</span>
              <strong>{stats.cancelledToday}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#757575' }}>New Users</span>
              <strong>{stats.newUsersToday}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#757575' }}>New Drivers</span>
              <strong>{stats.newDriversToday}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#757575' }}>Avg Fare per Ride</span>
              <strong>{stats.completedToday > 0 ? `\u20B9${(stats.totalRevenueToday / stats.completedToday).toFixed(0)}` : '\u20B90'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 20 }}>
        <ChartCard title="Daily Revenue (Last 14 Days)">
          {dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => `\u20B9${Number(v).toLocaleString()}`} />
                <Area type="monotone" dataKey="revenue" stroke="#1A73E8" fill="#E3F2FD" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Monthly Revenue (Last 12 Months)">
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => `\u20B9${Number(v).toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#4CAF50" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Ride Trend (Last 14 Days)">
          {dailyRides.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyRides}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#4CAF50" strokeWidth={2} name="Completed" />
                <Line type="monotone" dataKey="cancelled" stroke="#F44336" strokeWidth={2} name="Cancelled" />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Driver Activity (Last 14 Days)">
          {driverActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={driverActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="online" fill="#4CAF50" radius={[4, 4, 0, 0]} name="Online" />
                <Bar dataKey="offline" fill="#9E9E9E" radius={[4, 4, 0, 0]} name="Offline" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="User Growth (Last 30 Days)">
          {userGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#E91E63" fill="#FCE4EC" name="New Users" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Driver Growth (Last 30 Days)">
          {driverGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={driverGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#FF6D00" fill="#FFF3E0" name="New Drivers" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#333' }}>{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p style={{ color: '#9E9E9E', textAlign: 'center', padding: 40, fontSize: 13 }}>No data available</p>;
}
