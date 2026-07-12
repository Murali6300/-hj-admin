import { useEffect, useState } from 'react';
import api from '../api';

interface PendingDriver {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  documentVerificationStatus: string;
  createdAt: string;
}

export default function PendingDriversPage() {
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState<Record<number, string>>({});

  const fetchPending = () => {
    api.get('/drivers/pending').then((res) => { setDrivers(res.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this driver?')) return;
    await api.put(`/drivers/${id}/approve`, { remarks: remarks[id] || '' });
    fetchPending();
  };

  const handleReject = async (id: number) => {
    const reason = remarks[id] || '';
    if (!reason) { alert('Please add remarks for rejection.'); return; }
    await api.put(`/drivers/${id}/reject`, { remarks: reason });
    fetchPending();
  };

  if (loading) return <p>Loading pending drivers...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Pending Driver Approvals</h1>
      {drivers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 10 }}>
          <p style={{ fontSize: 48 }}>✅</p>
          <p style={{ fontSize: 16, color: '#757575', marginTop: 12 }}>No pending approvals</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {drivers.map((d) => (
            <div key={d.id} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #FF6D00' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, marginBottom: 4 }}>{d.name}</h3>
                  <p style={{ fontSize: 13, color: '#757575' }}>{d.email} · {d.phoneNumber}</p>
                </div>
                <span style={{ fontSize: 12, color: '#757575' }}>Applied: {new Date(d.createdAt).toLocaleDateString()}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13 }}>
                <div><strong>Vehicle:</strong> {d.vehicleType}</div>
                <div><strong>Number:</strong> {d.vehicleNumber}</div>
                <div><strong>License:</strong> {d.licenseNumber}</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Remarks (required for rejection)"
                  value={remarks[d.id] || ''}
                  onChange={(e) => setRemarks({ ...remarks, [d.id]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 6, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleApprove(d.id)} style={{ padding: '8px 20px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                  ✓ Approve
                </button>
                <button onClick={() => handleReject(d.id)} style={{ padding: '8px 20px', background: '#F44336', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
