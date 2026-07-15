import { useEffect, useState } from 'react';
import api from '../api';

interface Ticket {
  id: number;
  userId: number;
  driverId: number;
  rideId: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assignedAdminId: number;
  resolution: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#F44336', IN_PROGRESS: '#FF9800', RESOLVED: '#4CAF50', CLOSED: '#9E9E9E',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#4CAF50', MEDIUM: '#FF9800', HIGH: '#F44336', URGENT: '#B71C1C',
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resolution, setResolution] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: 20 };
      if (filterStatus !== 'ALL') params.status = filterStatus;
      const res = await api.get('/support', { params });
      setTickets(res.data.content || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [page, filterStatus]);

  const handleAssign = async (id: number) => {
    await api.put(`/support/${id}/assign?adminId=1`);
    fetchTickets();
  };

  const handleResolve = async (id: number) => {
    if (!resolution.trim()) { alert('Please enter resolution'); return; }
    await api.put(`/support/${id}/resolve?resolution=${encodeURIComponent(resolution)}`);
    setSelectedTicket(null);
    setResolution('');
    fetchTickets();
  };

  const handleClose = async (id: number) => {
    await api.put(`/support/${id}/close`);
    fetchTickets();
  };

  const handleEscalate = async (id: number) => {
    await api.put(`/support/${id}/escalate`);
    fetchTickets();
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Support Ticket Management</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
          <button key={s} onClick={() => { setFilterStatus(s); setPage(0); }}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: filterStatus === s ? (STATUS_COLORS[s] || '#1A73E8') : '#E0E0E0', color: filterStatus === s ? '#fff' : '#616161' }}>
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p style={{ color: '#757575', textAlign: 'center', padding: 40 }}>No support tickets found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Subject</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Assigned To</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(ticket => (
              <tr key={ticket.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                <td style={tdStyle}>#{ticket.id}</td>
                <td style={tdStyle}>{ticket.subject}</td>
                <td style={tdStyle}>{ticket.userId ? 'User' : ticket.driverId ? 'Driver' : 'N/A'} #{ticket.userId || ticket.driverId || '-'}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${PRIORITY_COLORS[ticket.priority]}22`, color: PRIORITY_COLORS[ticket.priority] }}>
                    {ticket.priority}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${STATUS_COLORS[ticket.status]}22`, color: STATUS_COLORS[ticket.status] }}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={tdStyle}>{ticket.assignedAdminId ? `Admin #${ticket.assignedAdminId}` : 'Unassigned'}</td>
                <td style={tdStyle}>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setSelectedTicket(ticket)} style={btnPrimary}>View</button>
                    {!ticket.assignedAdminId && (
                      <button onClick={() => handleAssign(ticket.id)} style={btnSuccess}>Assign</button>
                    )}
                    {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && ticket.priority !== 'URGENT' && (
                      <button onClick={() => handleEscalate(ticket.id)} style={{ padding: '4px 10px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Escalate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={pageBtnStyle}>Previous</button>
        <span style={{ padding: '6px 12px', fontSize: 14 }}>Page {page + 1}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={tickets.length < 20} style={{ ...pageBtnStyle, opacity: tickets.length < 20 ? 0.5 : 1 }}>Next</button>
      </div>

      {selectedTicket && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 30, maxWidth: 550, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20 }}>Ticket #{selectedTicket.id}</h2>
              <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>X</button>
            </div>

            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <p><strong>Subject:</strong> {selectedTicket.subject}</p>
              <p><strong>Description:</strong> {selectedTicket.description}</p>
              <p><strong>Type:</strong> {selectedTicket.userId ? 'User' : 'Driver'} #{selectedTicket.userId || selectedTicket.driverId}</p>
              {selectedTicket.rideId && <p><strong>Ride:</strong> #{selectedTicket.rideId}</p>}
              <p><strong>Priority:</strong> <span style={{ color: PRIORITY_COLORS[selectedTicket.priority] }}>{selectedTicket.priority}</span></p>
              <p><strong>Status:</strong> <span style={{ color: STATUS_COLORS[selectedTicket.status] }}>{selectedTicket.status.replace('_', ' ')}</span></p>
              <p><strong>Created:</strong> {new Date(selectedTicket.createdAt).toLocaleString('en-IN')}</p>
              {selectedTicket.resolution && <p><strong>Resolution:</strong> {selectedTicket.resolution}</p>}
            </div>

            {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
              <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
                <textarea placeholder="Resolution notes..." value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, marginBottom: 8, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleResolve(selectedTicket.id)} style={btnSuccess}>Mark Resolved</button>
                  <button onClick={() => handleClose(selectedTicket.id)} style={{ padding: '8px 16px', background: '#9E9E9E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Close Ticket</button>
                  {selectedTicket.priority !== 'URGENT' && (
                    <button onClick={() => handleEscalate(selectedTicket.id)} style={{ padding: '8px 16px', background: '#FF9800', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Escalate</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const btnPrimary: React.CSSProperties = { padding: '4px 10px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' };
const btnSuccess: React.CSSProperties = { padding: '4px 10px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' };
const pageBtnStyle: React.CSSProperties = { padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' };
