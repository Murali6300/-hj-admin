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
  SUCCESS: '#4CAF50', PENDING: '#FFC107', FAILED: '#F44336',
  CANCELLED: '#9E9E9E', PROCESSING: '#2196F3', REFUNDED: '#FF6D00',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchRideId, setSearchRideId] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [invoicePayment, setInvoicePayment] = useState<Payment | null>(null);

  const METHODS = ['ALL', 'CASH', 'UPI', 'CARD', 'WALLET', 'RAZORPAY'];

  const fetchPayments = async () => {
    setLoading(true); setError('');
    try {
      if (searchRideId.trim()) {
        const res = await api.get(`/payments/ride/${searchRideId.trim()}`);
        setPayments([res.data]); setTotal(1);
      } else {
        const params: Record<string, string | number> = { page, size: 20 };
        if (filterStatus !== 'ALL') params.status = filterStatus;
        if (filterMethod !== 'ALL') params.method = filterMethod;
        const res = await api.get('/payments', { params });
        setPayments(res.data.payments || []); setTotal(res.data.total || 0);
      }
    } catch { setError('Failed to load payments'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPayments(); }, [page, filterStatus, filterMethod]);

  const handleRetry = async (paymentId: number) => {
    if (!confirm('Retry this payment?')) return;
    try { await api.post(`/payments/${paymentId}/process`, { paymentMethod: 'UPI' }); fetchPayments(); } catch { alert('Retry failed'); }
  };

  const handleDownloadReceipt = (p: Payment) => {
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;padding:40px}h1{color:#1A73E8}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{padding:10px;border:1px solid #ddd;text-align:left}.label{font-weight:600;width:40%}.amount{font-size:24px;font-weight:700;color:#1A73E8}</style></head><body>
      <h1>HJ Ride - Payment Receipt</h1>
      <p style="color:#757575">Invoice #INV${p.paymentId}</p>
      <table><tr><td class="label">Payment ID</td><td>PAY${p.paymentId}</td></tr>
      <tr><td class="label">Ride ID</td><td>#${p.rideId}</td></tr>
      <tr><td class="label">Pickup</td><td>${p.pickupAddress || 'N/A'}</td></tr>
      <tr><td class="label">Destination</td><td>${p.dropoffAddress || 'N/A'}</td></tr>
      <tr><td class="label">Payment Method</td><td>${p.paymentMethod}</td></tr>
      <tr><td class="label">Transaction ID</td><td>${p.transactionId || 'N/A'}</td></tr>
      <tr><td class="label">Status</td><td>${p.paymentStatus}</td></tr>
      <tr><td class="label">Date</td><td>${new Date(p.createdAt).toLocaleString('en-IN')}</td></tr>
      <tr><td class="label">Amount Paid</td><td class="amount">₹${p.totalFare.toFixed(2)}</td></tr></table>
      <p style="margin-top:30px;color:#757575;font-size:12px">Thank you for riding with HJ Ride!</p></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `receipt-PAY${p.paymentId}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const csv = ['Payment ID,Ride ID,Amount,Method,Status,Transaction ID,Created At',
      ...payments.map(p => `${p.paymentId},${p.rideId},${p.totalFare},${p.paymentMethod},${p.paymentStatus},${p.transactionId || ''},${p.createdAt}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'payments-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Payments</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {METHODS.map((m) => (
          <button key={m} onClick={() => { setFilterMethod(m); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #ddd', background: filterMethod === m ? '#1A73E8' : '#fff', color: filterMethod === m ? '#fff' : '#333', fontSize: 12, cursor: 'pointer', fontWeight: filterMethod === m ? 600 : 400 }}>
            {m === 'ALL' ? 'All Methods' : m.charAt(0) + m.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search by Ride ID..." value={searchRideId}
          onChange={(e) => setSearchRideId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (() => { setPage(1); fetchPayments(); })()}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
          <option value="ALL">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <button onClick={() => { setPage(1); fetchPayments(); }} style={{ padding: '8px 16px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Search</button>
        <button onClick={handleExport} style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Export CSV</button>
      </div>

      {error && <p style={{ color: '#F44336', marginBottom: 12 }}>{error}</p>}

      {loading ? <p>Loading...</p> : payments.length === 0 ? (
        <p style={{ color: '#757575' }}>No payments found</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={thStyle}>Payment ID</th>
                <th style={thStyle}>Ride ID</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Method</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Transaction ID</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.paymentId} style={{ borderTop: '1px solid #eee' }}>
                  <td style={tdStyle}>PAY{p.paymentId}</td>
                  <td style={tdStyle}>#{p.rideId}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>₹{p.totalFare.toFixed(2)}</td>
                  <td style={tdStyle}>{p.paymentMethod}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: STATUS_COLORS[p.paymentStatus] || '#9E9E9E' }}>
                      {p.paymentStatus}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#757575' }}>{p.transactionId || '-'}</td>
                  <td style={{ ...tdStyle, color: '#757575' }}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => setInvoicePayment(p)} style={{ padding: '4px 8px', background: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Invoice</button>
                      <button onClick={() => handleDownloadReceipt(p)} style={{ padding: '4px 8px', background: '#E8F5E9', color: '#2E7D32', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Receipt</button>
                      {p.paymentStatus === 'FAILED' && (
                        <button onClick={() => handleRetry(p.paymentId)} style={{ padding: '4px 8px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Retry</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ color: '#757575', fontSize: 14 }}>Total: {total} payments</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle(page === 1)}>Previous</button>
              <span style={{ padding: '6px 12px', fontSize: 14 }}>Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={payments.length < 20} style={pageBtnStyle(payments.length < 20)}>Next</button>
            </div>
          </div>
        </>
      )}

      {invoicePayment && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>Invoice #INV{invoicePayment.paymentId}</h2>
              <button onClick={() => setInvoicePayment(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 20, fontSize: 13 }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#1A73E8', margin: 0 }}>HJ Ride</p>
                <p style={{ fontSize: 12, color: '#757575', margin: '4px 0 0' }}>Payment Receipt</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={invLabel}>Payment ID</td><td style={invVal}>PAY{invoicePayment.paymentId}</td></tr>
                  <tr><td style={invLabel}>Ride ID</td><td style={invVal}>#{invoicePayment.rideId}</td></tr>
                  <tr><td style={invLabel}>Pickup</td><td style={invVal}>{invoicePayment.pickupAddress || 'N/A'}</td></tr>
                  <tr><td style={invLabel}>Destination</td><td style={invVal}>{invoicePayment.dropoffAddress || 'N/A'}</td></tr>
                  <tr><td style={invLabel}>Method</td><td style={invVal}>{invoicePayment.paymentMethod}</td></tr>
                  <tr><td style={invLabel}>Transaction ID</td><td style={invVal}>{invoicePayment.transactionId || 'N/A'}</td></tr>
                  <tr><td style={invLabel}>Status</td><td style={invVal}><span style={{ color: STATUS_COLORS[invoicePayment.paymentStatus], fontWeight: 600 }}>{invoicePayment.paymentStatus}</span></td></tr>
                  <tr><td style={invLabel}>Date</td><td style={invVal}>{new Date(invoicePayment.createdAt).toLocaleString('en-IN')}</td></tr>
                  <tr><td style={{ ...invLabel, fontWeight: 700, fontSize: 14 }}>Amount</td><td style={{ ...invVal, fontSize: 20, fontWeight: 700, color: '#1A73E8' }}>₹{invoicePayment.totalFare.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => handleDownloadReceipt(invoicePayment)} style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Download Receipt</button>
              <button onClick={() => setInvoicePayment(null)} style={{ padding: '8px 16px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 12, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 12 };
const invLabel: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, borderBottom: '1px solid #E0E0E0', fontSize: 12 };
const invVal: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #E0E0E0', fontSize: 12 };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxHeight: '85vh', overflow: 'auto' };
const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 });
