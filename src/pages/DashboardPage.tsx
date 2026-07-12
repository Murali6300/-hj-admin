import { useEffect, useState } from 'react';
import api from '../api';

interface DashboardStats {
  totalUsers: number;
  totalDrivers: number;
  pendingDriverApprovals: number;
  activeRides: number;
  completedToday: number;
  cancelledToday: number;
  totalRevenueToday: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then((res) => { setStats(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (!stats) return <p>Failed to load dashboard data.</p>;

  const cards = [
    { label: 'Today', value: `₹${stats.totalRevenueToday.toLocaleString()}`, sub: 'Revenue', color: '#1A73E8', icon: '💰' },
    { label: 'Online', value: String(stats.activeRides), sub: 'Active Rides', color: '#4CAF50', icon: '🗺️' },
    { label: 'Registered', value: stats.totalUsers.toLocaleString(), sub: 'Total Users', color: '#9C27B0', icon: '👥' },
    { label: 'Drivers', value: String(stats.totalDrivers), sub: 'Total Drivers', color: '#FF6D00', icon: '🚗' },
    { label: 'Completed', value: String(stats.completedToday), sub: 'Completed Today', color: '#00BCD4', icon: '✅' },
    { label: 'Cancelled', value: String(stats.cancelledToday), sub: 'Cancelled Today', color: '#F44336', icon: '❌' },
    { label: 'Pending', value: String(stats.pendingDriverApprovals), sub: 'Driver Approvals', color: '#FF9800', icon: '⏳' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Admin Dashboard</h1>
        <p style={{ color: '#757575', fontSize: 14 }}>Overview of platform operations</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 12, padding: 20, borderTop: `3px solid ${card.color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#757575' }}>{card.label}</span>
              <span style={{ fontSize: 20 }}>{card.icon}</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: card.color, marginBottom: 4 }}>{card.value}</p>
            <p style={{ fontSize: 12, color: '#9E9E9E' }}>{card.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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
              <strong>₹{stats.totalRevenueToday.toLocaleString()}</strong>
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
              <span style={{ color: '#757575' }}>Avg Fare per Ride</span>
              <strong>{stats.completedToday > 0 ? `₹${(stats.totalRevenueToday / stats.completedToday).toFixed(0)}` : '₹0'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#757575' }}>Cancellation Rate</span>
              <strong>{(stats.completedToday + stats.cancelledToday) > 0 ? `${((stats.cancelledToday / (stats.completedToday + stats.cancelledToday)) * 100).toFixed(1)}%` : '0%'}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
