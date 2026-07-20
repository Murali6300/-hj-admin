import { useEffect, useState } from 'react';
import api from '../api';

interface EarningsSummary {
  totalRevenue: number;
  totalPlatformCommission: number;
  totalDriverEarnings: number;
  totalGst: number;
  totalRides: number;
  topDrivers: { driverId: number; driverName: string; totalRides: number; netEarnings: number }[];
}

export default function EarningsCommissionPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/earnings');
      setSummary(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load earnings data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEarnings(); }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <p style={{ color: '#757575', fontSize: 14 }}>Loading earnings data...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: '#F44336', fontSize: 16, marginBottom: 12 }}>{error || 'Failed to load earnings data'}</p>
        <button
          onClick={fetchEarnings}
          style={{ padding: '10px 24px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>Earnings & Commission</h1>
        <button
          onClick={fetchEarnings}
          style={{ padding: '6px 16px', background: '#E3F2FD', color: '#1E88E5', border: '1px solid #BBDEFB', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <MetricCard label="Total Revenue" value={`\u20B9${summary.totalRevenue.toLocaleString()}`} color="#388E3C" />
        <MetricCard label="Platform Commission (20%)" value={`\u20B9${summary.totalPlatformCommission.toLocaleString()}`} color="#1E88E5" />
        <MetricCard label="Driver Earnings" value={`\u20B9${summary.totalDriverEarnings.toLocaleString()}`} color="#9C27B0" />
        <MetricCard label="GST (18% on Commission)" value={`\u20B9${summary.totalGst.toLocaleString()}`} color="#FF6D00" />
        <MetricCard label="Total Rides" value={String(summary.totalRides)} color="#00BCD4" />
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Top Earning Drivers</h2>
      {summary.topDrivers.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Driver ID</th>
              <th style={thStyle}>Driver Name</th>
              <th style={thStyle}>Total Rides</th>
              <th style={thStyle}>Net Earnings</th>
            </tr>
          </thead>
          <tbody>
            {summary.topDrivers.map((d, i) => (
              <tr key={d.driverId} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{d.driverId}</td>
                <td style={tdStyle}>{d.driverName}</td>
                <td style={tdStyle}>{d.totalRides}</td>
                <td style={tdStyle}>\u20B9{d.netEarnings.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: '#757575' }}>No driver earnings data yet.</p>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 20, borderLeft: `4px solid ${color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <p style={{ fontSize: 13, color: '#757575', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
