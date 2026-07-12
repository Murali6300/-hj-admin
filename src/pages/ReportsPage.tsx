import { useEffect, useState } from 'react';
import api from '../api';

interface ReportData {
  reportType: string;
  period: string;
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  totalRevenue: number;
  totalDriverEarnings: number;
  totalPlatformCommission: number;
  averageFare: number;
  averageRating: number;
}

type ReportType = 'daily' | 'weekly' | 'monthly';

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportType>('daily');
  const [dateParam, setDateParam] = useState('');

  const fetchReport = async (type: ReportType) => {
    setLoading(true);
    setActiveTab(type);
    try {
      let url = `/reports/${type}`;
      if (dateParam) url += `?${type === 'daily' ? 'date' : type === 'monthly' ? 'month' : 'startDate'}=${dateParam}`;
      const res = await api.get(url);
      setReport(res.data);
    } catch { setReport(null); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReport('daily'); }, []);

  const handleExport = () => {
    if (!report) return;
    const csv = [
      'Metric,Value',
      `Report Type,${report.reportType}`,
      `Period,${report.period}`,
      `Total Rides,${report.totalRides}`,
      `Completed Rides,${report.completedRides}`,
      `Cancelled Rides,${report.cancelledRides}`,
      `Total Revenue,₹${report.totalRevenue}`,
      `Average Fare,₹${report.averageFare}`,
      `Average Rating,${report.averageRating}`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${report.reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Reports & Analytics</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['daily', 'weekly', 'monthly'] as ReportType[]).map(t => (
          <button key={t} onClick={() => fetchReport(t)}
            style={{ padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: activeTab === t ? '#1A73E8' : '#E0E0E0', color: activeTab === t ? '#fff' : '#616161' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)} Report
          </button>
        ))}
        <input type={activeTab === 'daily' ? 'date' : activeTab === 'monthly' ? 'month' : 'date'}
          value={dateParam} onChange={(e) => setDateParam(e.target.value)}
          style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, marginLeft: 8 }} />
        <button onClick={() => fetchReport(activeTab)} style={{ padding: '8px 16px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Generate</button>
        <button onClick={handleExport} style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Export CSV</button>
      </div>

      {loading ? (
        <p>Generating report...</p>
      ) : report ? (
        <>
          <p style={{ color: '#757575', marginBottom: 16 }}>Period: {report.period}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            <ReportCard label="Total Rides" value={String(report.totalRides)} icon="&#x1F697;" />
            <ReportCard label="Completed" value={String(report.completedRides)} icon="&#x2705;" />
            <ReportCard label="Cancelled" value={String(report.cancelledRides)} icon="&#x274C;" />
            <ReportCard label="Revenue" value={`₹${report.totalRevenue.toLocaleString()}`} icon="&#x1F4B0;" />
            <ReportCard label="Average Fare" value={`₹${report.averageFare.toFixed(0)}`} icon="&#x1F4CA;" />
            <ReportCard label="Avg Rating" value={report.averageRating.toFixed(1)} icon="&#x2B50;" />
            <ReportCard label="Cancellation Rate" value={report.totalRides > 0 ? `${((report.cancelledRides / report.totalRides) * 100).toFixed(1)}%` : '0%'} icon="&#x1F4C9;" />
          </div>
        </>
      ) : (
        <p style={{ color: '#757575' }}>Select a report type and click Generate.</p>
      )}
    </div>
  );
}

function ReportCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
      <p style={{ fontSize: 32, marginBottom: 8 }}>{icon}</p>
      <p style={{ fontSize: 13, color: '#757575', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>{value}</p>
    </div>
  );
}
