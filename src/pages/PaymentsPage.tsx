import { useEffect, useState } from 'react';
import api from '../api';

interface Payment {
  paymentId: number;
  rideId: number;
  totalFare: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionId?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: '#4CAF50',
  PENDING: '#FFC107',
  FAILED: '#F44336',
  CANCELLED: '#9E9E9E',
  PROCESSING: '#2196F3',
  REFUNDED: '#FF6D00',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchRideId, setSearchRideId] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      if (searchRideId.trim()) {
        const res = await api.get(`/payments/ride/${searchRideId.trim()}`);
        setPayments([res.data]);
        setTotal(1);
      } else {
        const params: Record<string, string | number> = { page, size: 20 };
        if (filterStatus !== 'ALL') params.status = filterStatus;
        const res = await api.get('/payments/history', { params });
        setPayments(res.data.payments || []);
        setTotal(res.data.total || 0);
      }
    } catch {
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, filterStatus]);

  const handleSearch = () => {
    setPage(1);
    fetchPayments();
  };

  const handleExport = () => {
    const csv = [
      'Payment ID,Ride ID,Amount,Method,Status,Transaction ID,Created At',
      ...payments.map(p =>
        `${p.paymentId},${p.rideId},${p.totalFare},${p.paymentMethod},${p.paymentStatus},${p.transactionId || ''},${p.createdAt}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payments-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Payments</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by Ride ID..."
          value={searchRideId}
          onChange={(e) => setSearchRideId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        >
          <option value="ALL">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          onClick={handleSearch}
          style={{ padding: '8px 16px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Search
        </button>
        <button
          onClick={handleExport}
          style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Export CSV
        </button>
      </div>

      {error && <p style={{ color: '#F44336', marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : payments.length === 0 ? (
        <p style={{ color: '#757575' }}>No payments found</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Payment ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ride ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Method</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Transaction ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.paymentId} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '12px 16px' }}>PAY{payment.paymentId}</td>
                  <td style={{ padding: '12px 16px' }}>#{payment.rideId}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>₹{payment.totalFare.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>{payment.paymentMethod}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#fff',
                      background: STATUS_COLORS[payment.paymentStatus] || '#9E9E9E',
                    }}>
                      {payment.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#757575' }}>{payment.transactionId || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#757575' }}>
                    {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ color: '#757575', fontSize: 14 }}>Total: {total} payments</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <span style={{ padding: '6px 12px', fontSize: 14 }}>Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={payments.length < 20}
                style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: payments.length < 20 ? 'not-allowed' : 'pointer', opacity: payments.length < 20 ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
