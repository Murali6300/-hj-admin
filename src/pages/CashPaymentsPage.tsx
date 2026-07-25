import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface CashPayment {
  paymentId: number;
  rideId: number;
  totalFare: number;
  paymentMethod: string;
  paymentStatus: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  gstAmount?: number;
  createdAt: string;
  userName?: string;
  driverName?: string;
  platformCommission?: number;
  driverEarnings?: number;
  settlementStatus?: string;
  disputeReason?: string;
  disputeCategory?: string;
  disputeComment?: string;
  disputeTicketNumber?: string;
}

interface CashStats {
  pending: number;
  disputed: number;
  resolved: number;
  pendingAmount: number;
  todayCollection: number;
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: '#4CAF50',
  PENDING: '#FFC107',
  FAILED: '#F44336',
  DISPUTED: '#E91E63',
  PENDING_USER_CONFIRMATION: '#FF9800',
  REFUNDED: '#FF6D00',
  CANCELLED: '#9E9E9E',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Waiting Confirmation',
  PENDING_USER_CONFIRMATION: 'Pending User Confirm',
  SUCCESS: 'Resolved',
  DISPUTED: 'Disputed',
};

const quickFilters = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'week' },
  { label: 'All Time', value: 'all' },
];

export default function CashPaymentsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CashStats | null>(null);
  const [payments, setPayments] = useState<CashPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchRideId, setSearchRideId] = useState('');

  const getDateRange = useCallback((filter: string) => {
    const now = new Date();
    const start = new Date(now);
    switch (filter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      default:
        return { since: undefined, until: undefined };
    }
    return {
      since: start.toISOString(),
      until: now.toISOString(),
    };
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/payments/cash/stats');
      setStats(res.data);
    } catch {
      // silent
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (searchRideId.trim()) {
        const res = await api.get(`/payments/ride/${searchRideId.trim()}`);
        setPayments([res.data]);
        setTotal(1);
      } else {
        const params: Record<string, string | number> = { page: page - 1, size: 20 };
        if (filterStatus !== 'ALL') params.status = filterStatus;
        const range = getDateRange(activeFilter);
        if (range.since) params.since = range.since;
        if (range.until) params.until = range.until;
        const res = await api.get('/payments/cash', { params });
        setPayments(res.data.content || []);
        setTotal(res.data.totalElements || 0);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load cash payments';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, activeFilter, searchRideId, getDateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleResolve = async (paymentId: number) => {
    const resolution = prompt('Enter resolution notes:');
    if (!resolution) return;
    const refund = confirm('Refund the user? Click OK for refund, Cancel to resolve in favor of driver.');
    try {
      await api.post(`/payments/${paymentId}/resolve-dispute`, { resolution, refund });
      fetchPayments();
      fetchStats();
    } catch {
      alert('Failed to resolve dispute');
    }
  };

  const handleExport = () => {
    const csv = [
      'Payment ID,Ride ID,Passenger,Driver,Amount,Status,Payment Method,Commission,Driver Earnings,Dispute Category,Dispute Comment,Ticket,Created At',
      ...payments.map(
        (p) =>
          `${p.paymentId},${p.rideId},"${(p.userName || '').replace(/"/g, '""')}","${(p.driverName || '').replace(/"/g, '""')}",${p.totalFare},${p.paymentStatus},${p.paymentMethod},${p.platformCommission ?? ''},${p.driverEarnings ?? ''},${p.disputeCategory || ''},${(p.disputeComment || '').replace(/"/g, '""')},${p.disputeTicketNumber || ''},${p.createdAt}`,
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cash-payments-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Cash Payment Management</h1>

      {/* ── Stats Cards ─────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div
            style={{
              background: '#FFF8E1',
              border: '1px solid #FFE082',
              borderRadius: 12,
              padding: '20px 16px',
              cursor: 'pointer',
            }}
            onClick={() => { setFilterStatus('PENDING'); setPage(1); }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: '#F57C00' }}>{stats.pending}</div>
            <div style={{ fontSize: 13, color: '#BF360C', marginTop: 4 }}>Pending</div>
          </div>
          <div
            style={{
              background: '#FCE4EC',
              border: '1px solid #F8BBD0',
              borderRadius: 12,
              padding: '20px 16px',
              cursor: 'pointer',
            }}
            onClick={() => { setFilterStatus('DISPUTED'); setPage(1); }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: '#C62828' }}>{stats.disputed}</div>
            <div style={{ fontSize: 13, color: '#AD1457', marginTop: 4 }}>Disputed</div>
          </div>
          <div
            style={{
              background: '#E8F5E9',
              border: '1px solid #C8E6C9',
              borderRadius: 12,
              padding: '20px 16px',
              cursor: 'pointer',
            }}
            onClick={() => { setFilterStatus('SUCCESS'); setPage(1); }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2E7D32' }}>{stats.resolved}</div>
            <div style={{ fontSize: 13, color: '#1B5E20', marginTop: 4 }}>Resolved</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 12, padding: '20px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1565C0' }}>
              ₹{stats.pendingAmount.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 13, color: '#616161', marginTop: 4 }}>Pending Amount</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 12, padding: '20px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#16A34A' }}>
              ₹{stats.todayCollection.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 13, color: '#616161', marginTop: 4 }}>Today&apos;s Collection</div>
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {quickFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setActiveFilter(f.value);
              setPage(1);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid #ddd',
              background: activeFilter === f.value ? '#16A34A' : '#fff',
              color: activeFilter === f.value ? '#fff' : '#333',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: activeFilter === f.value ? 600 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by Ride ID..."
          value={searchRideId}
          onChange={(e) => setSearchRideId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchPayments()}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        />
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Waiting Confirmation</option>
          <option value="PENDING_USER_CONFIRMATION">Pending User Confirmation</option>
          <option value="DISPUTED">Disputed</option>
          <option value="SUCCESS">Resolved</option>
        </select>
        <button
          onClick={() => {
            setPage(1);
            fetchPayments();
          }}
          style={{
            padding: '8px 16px',
            background: '#16A34A',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
        <button
          onClick={handleExport}
          style={{
            padding: '8px 16px',
            background: '#1565C0',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Export CSV
        </button>
        {(filterStatus !== 'ALL' || activeFilter !== 'all') && (
          <button
            onClick={() => {
              setFilterStatus('ALL');
              setActiveFilter('all');
              setSearchRideId('');
              setPage(1);
            }}
            style={{
              padding: '8px 16px',
              background: '#F44336',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && <p style={{ color: '#F44336', marginBottom: 12 }}>{error}</p>}

      {/* ── Table ───────────────────────────────────────── */}
      {loading ? (
        <p>Loading...</p>
      ) : payments.length === 0 ? (
        <p style={{ color: '#757575' }}>No cash payments found</p>
      ) : (
        <>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#fff',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={thStyle}>Ride ID</th>
                <th style={thStyle}>Passenger</th>
                <th style={thStyle}>Driver</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Ticket</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.paymentId} style={{ borderTop: '1px solid #eee' }}>
                  <td style={tdStyle}>HJ{p.rideId}</td>
                  <td style={tdStyle}>{p.userName || '-'}</td>
                  <td style={tdStyle}>{p.driverName || '-'}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>₹{p.totalFare.toFixed(0)}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#fff',
                        background: STATUS_COLORS[p.paymentStatus] || '#9E9E9E',
                      }}
                    >
                      {STATUS_LABELS[p.paymentStatus] || p.paymentStatus}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#E91E63', fontWeight: 500, fontSize: 11 }}>
                    {p.disputeTicketNumber || '-'}
                  </td>
                  <td style={{ ...tdStyle, color: '#757575' }}>
                    {new Date(p.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate('/cash-payments/' + p.paymentId)}
                        style={{
                          padding: '4px 8px',
                          background: '#E3F2FD',
                          color: '#1565C0',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                      {p.paymentStatus === 'DISPUTED' && (
                        <button
                          onClick={() => handleResolve(p.paymentId)}
                          style={{
                            padding: '4px 8px',
                            background: '#E91E63',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            <span style={{ color: '#757575', fontSize: 14 }}>
              Total: {total} cash payments
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={pageBtnStyle(page === 1)}
              >
                Previous
              </button>
              <span style={{ padding: '6px 12px', fontSize: 14 }}>Page {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={payments.length < 20}
                style={pageBtnStyle(payments.length < 20)}
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

const thStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 12,
  fontWeight: 600,
};
const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 12,
};
const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  border: '1px solid #ddd',
  borderRadius: 4,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});
