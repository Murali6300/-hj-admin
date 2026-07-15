import { useEffect, useState } from 'react';
import api from '../api';

interface Wallet {
  id: number;
  userId: number;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

interface WalletTxn {
  id: number;
  walletId: number;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId: string;
  status: string;
  createdAt: string;
}

interface WalletStats {
  totalBalance: number;
  totalTopUps: number;
  totalPayments: number;
  totalWallets: number;
  activeWallets: number;
}

const TXN_COLORS: Record<string, string> = {
  TOP_UP: '#4CAF50',
  PAYMENT: '#1A73E8',
  REFUND: '#FF6D00',
  WITHDRAWAL: '#F44336',
  BONUS: '#9C27B0',
  ADJUSTMENT: '#00BCD4',
};

export default function WalletPage() {
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchUserId, setSearchUserId] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ userId: '', amount: '', type: 'TOP_UP', description: '' });
  const [txnModal, setTxnModal] = useState<{ walletId: number; userId: number } | null>(null);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, walletsRes] = await Promise.all([
        api.get('/wallets/stats'),
        api.get('/wallets', { params: { page, size: 20 } }),
      ]);
      setStats(statsRes.data);
      setWallets(walletsRes.data.content || walletsRes.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSearch = async () => {
    if (!searchUserId.trim()) { fetchData(); return; }
    try {
      const res = await api.get(`/wallets/user/${searchUserId.trim()}`);
      setWallets([res.data]);
    } catch { setWallets([]); }
  };

  const handleAdjust = async () => {
    if (!confirm(`${Number(adjustForm.amount) >= 0 ? 'Credit' : 'Deduct'} ₹${Math.abs(Number(adjustForm.amount)).toLocaleString()} ${Number(adjustForm.amount) >= 0 ? 'to' : 'from'} this wallet?`)) return;
    try {
      await api.post('/wallets/adjust', {
        userId: Number(adjustForm.userId),
        amount: Number(adjustForm.amount),
        type: adjustForm.type,
        description: adjustForm.description,
      });
      setShowAdjust(false);
      setAdjustForm({ userId: '', amount: '', type: 'TOP_UP', description: '' });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to adjust balance');
    }
  };

  const openTransactions = async (walletId: number, userId: number) => {
    setTxnModal({ walletId, userId });
    try {
      const res = await api.get(`/wallets/${walletId}/transactions`, { params: { page: 0, size: 50 } });
      setTransactions(res.data.content || res.data || []);
    } catch { setTransactions([]); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>Wallet Management</h1>
        <button onClick={() => setShowAdjust(true)}
          style={{ padding: '8px 16px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Adjust Balance
        </button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <MetricCard label="Total Balance" value={`₹${stats.totalBalance.toLocaleString()}`} color="#1A73E8" />
          <MetricCard label="Total Top-ups" value={`₹${stats.totalTopUps.toLocaleString()}`} color="#4CAF50" />
          <MetricCard label="Total Payments" value={`₹${stats.totalPayments.toLocaleString()}`} color="#F44336" />
          <MetricCard label="Total Wallets" value={String(stats.totalWallets)} color="#9C27B0" />
          <MetricCard label="Active Wallets" value={String(stats.activeWallets)} color="#00BCD4" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          type="text" placeholder="Search by User ID..."
          value={searchUserId} onChange={(e) => setSearchUserId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        />
        <button onClick={handleSearch}
          style={{ padding: '8px 16px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Search
        </button>
      </div>

      {loading ? <p>Loading...</p> : wallets.length === 0 ? (
        <p style={{ color: '#757575' }}>No wallets found</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>Wallet ID</th>
              <th style={thStyle}>User ID</th>
              <th style={thStyle}>Balance</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((w) => (
              <tr key={w.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={tdStyle}>{w.id}</td>
                <td style={tdStyle}>{w.userId}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>₹{w.balance.toLocaleString()}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: w.isActive ? '#4CAF50' : '#9E9E9E' }}>
                    {w.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: '#757575' }}>{new Date(w.createdAt).toLocaleDateString('en-IN')}</td>
                <td style={tdStyle}>
                  <button onClick={() => openTransactions(w.id, w.userId)}
                    style={{ padding: '4px 10px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                    View Transactions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAdjust && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Adjust Wallet Balance</h2>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>User ID</span>
              <input type="number" value={adjustForm.userId} onChange={(e) => setAdjustForm({ ...adjustForm, userId: e.target.value })}
                style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Amount</span>
              <input type="number" value={adjustForm.amount} onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Type</span>
              <select value={adjustForm.type} onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }}>
                <option value="TOP_UP">Top Up</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="WITHDRAWAL">Withdrawal</option>
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Description</span>
              <input type="text" value={adjustForm.description} onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAdjust}
                style={{ padding: '8px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Submit
              </button>
              <button onClick={() => setShowAdjust(false)}
                style={{ padding: '8px 16px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {txnModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 800 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>Transactions — User #{txnModal.userId}</h2>
              <button onClick={() => setTxnModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            {transactions.length === 0 ? (
              <p style={{ color: '#757575' }}>No transactions yet</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Balance After</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} style={{ borderTop: '1px solid #eee' }}>
                      <td style={tdStyle}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: TXN_COLORS[t.type] || '#9E9E9E' }}>
                          {t.type}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>₹{t.amount.toLocaleString()}</td>
                      <td style={tdStyle}>₹{t.balanceAfter.toLocaleString()}</td>
                      <td style={tdStyle}>{t.description || '-'}</td>
                      <td style={tdStyle}>{t.status}</td>
                      <td style={{ ...tdStyle, color: '#757575' }}>{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
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
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, maxWidth: 480, width: '100%', maxHeight: '80vh', overflow: 'auto' };
