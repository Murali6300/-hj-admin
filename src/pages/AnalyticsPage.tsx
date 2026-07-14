import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import api from '../api';
import { getVehicleIcon } from '../utils/vehicleIcons';

interface AnalyticsData {
  topDrivers: { name: string; rides: number; earnings: number; rating: number }[];
  ridesByVehicle: { type: string; count: number }[];
  peakHours: { hour: string; rides: number }[];
  dailyRides: { date: string; rides: number; cancelled: number }[];
  dailyRevenue: { date: string; revenue: number }[];
  newUsers: { date: string; count: number }[];
  driverRatings: { range: string; count: number }[];
  cancellationReasons: { reason: string; count: number }[];
}

const COLORS = ['#1A73E8', '#4CAF50', '#FF6D00', '#F44336', '#9C27B0', '#00BCD4', '#FFC107'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [ridesRes, earningsRes, usersRes] = await Promise.allSettled([
          api.get('/rides', { params: { page: 0, size: 500 } }),
          api.get('/earnings'),
          api.get('/users', { params: { page: 0, size: 500 } }),
        ]);

        const rides = ridesRes.status === 'fulfilled' ? (ridesRes.value.data.content || []) : [];
        const earnings = earningsRes.status === 'fulfilled' ? earningsRes.value.data : null;
        const users = usersRes.status === 'fulfilled' ? (usersRes.value.data?.content || usersRes.value.data || []) : [];

        const vehicleCounts: Record<string, number> = {};
        rides.forEach((r: any) => {
          const t = r.rideType || 'CAR';
          vehicleCounts[t] = (vehicleCounts[t] || 0) + 1;
        });

        const hourCounts: Record<string, number> = {};
        for (let h = 0; h < 24; h++) hourCounts[`${h}:00`] = 0;
        rides.forEach((r: any) => {
          if (r.createdAt) {
            const h = new Date(r.createdAt).getHours();
            hourCounts[`${h}:00`] = (hourCounts[`${h}:00`] || 0) + 1;
          }
        });

        const dateRides: Record<string, { rides: number; cancelled: number }> = {};
        const dateRevenue: Record<string, number> = {};
        const dateUsers: Record<string, number> = {};

        rides.forEach((r: any) => {
          const d = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Unknown';
          if (!dateRides[d]) dateRides[d] = { rides: 0, cancelled: 0 };
          dateRides[d].rides++;
          if (r.status === 'CANCELLED') dateRides[d].cancelled++;
          if (r.status === 'COMPLETED' && r.actualFare) {
            dateRevenue[d] = (dateRevenue[d] || 0) + r.actualFare;
          }
        });

        users.forEach((u: any) => {
          if (u.createdAt) {
            const d = new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            dateUsers[d] = (dateUsers[d] || 0) + 1;
          }
        });

        const cancelReasons: Record<string, number> = {};
        rides.forEach((r: any) => {
          if (r.status === 'CANCELLED' && r.cancellationReason) {
            cancelReasons[r.cancellationReason] = (cancelReasons[r.cancellationReason] || 0) + 1;
          }
        });

        const ratingBuckets: Record<string, number> = { '1-2': 0, '2-3': 0, '3-4': 0, '4-5': 0 };

        setData({
          topDrivers: earnings?.topDrivers?.slice(0, 10) || [],
          ridesByVehicle: Object.entries(vehicleCounts).map(([type, count]) => ({ type, count })),
          peakHours: Object.entries(hourCounts).map(([hour, rides]) => ({ hour, rides })),
          dailyRides: Object.entries(dateRides).slice(-14).map(([date, v]) => ({ date, ...v })),
          dailyRevenue: Object.entries(dateRevenue).slice(-14).map(([date, revenue]) => ({ date, revenue })),
          newUsers: Object.entries(dateUsers).slice(-30).map(([date, count]) => ({ date, count })),
          driverRatings: Object.entries(ratingBuckets).map(([range, count]) => ({ range, count })),
          cancellationReasons: Object.entries(cancelReasons).map(([reason, count]) => ({ reason, count })),
        });
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <p>Loading analytics...</p>;
  if (!data) return <p>Failed to load analytics data.</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Analytics</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 20 }}>

        <ChartCard title="Rides by Vehicle Type">
          {data.ridesByVehicle.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.ridesByVehicle} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={(props: any) => { const { type, count } = props; return `${getVehicleIcon(type)} ${type}: ${count}`; }}>
                  {data.ridesByVehicle.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Peak Hours">
          {data.peakHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="rides" fill="#1A73E8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Daily Rides (Last 14 Days)">
          {data.dailyRides.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.dailyRides}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rides" stroke="#1A73E8" strokeWidth={2} name="Completed" />
                <Line type="monotone" dataKey="cancelled" stroke="#F44336" strokeWidth={2} name="Cancelled" />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Top Earning Drivers">
          {data.topDrivers.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topDrivers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                <Bar dataKey="earnings" fill="#4CAF50" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Driver Ratings Distribution">
          {data.driverRatings.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.driverRatings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#FFC107" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Cancellation Reasons">
          {data.cancellationReasons.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.cancellationReasons} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="reason" fontSize={11} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#F44336" radius={[0, 4, 4, 0]} />
              </BarChart>
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
