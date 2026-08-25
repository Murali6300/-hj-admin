import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface FraudFlag {
  id: number;
  flagType: string;
  severity: string;
  entityType: string;
  entityId: number;
  description: string;
  relatedPaymentId: number | null;
  relatedRideId: number | null;
  evidenceJson: string | null;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

interface FraudStats {
  unresolvedFlags: number;
  totalFlags: number;
  resolvedFlags: number;
  flagsByType: { flagType: string; count: number }[];
  repeatOffenders: { entityType: string; entityId: number; flagCount: number }[];
}

const FLAG_TYPE_LABELS: Record<string, string> = {
  MULTIPLE_DISPUTES_PASSENGER: 'Multiple Disputes (Passenger)',
  MULTIPLE_DISPUTES_DRIVER: 'Multiple Disputes (Driver)',
  DRIVER_FREQUENT_UNPAID_REPORTS: 'Frequent Unpaid Reports (Driver)',
  PASSENGER_UNCONFIRMED_PAYMENTS: 'Unconfirmed Payments (Passenger)',
  GPS_MISMATCH: 'GPS Mismatch',
  RIDE_DURATION_ANOMALY: 'Ride Duration Anomaly',
  MANUAL_FARE_CHANGE: 'Manual Fare Change',
  DUPLICATE_CONFIRMATION: 'Duplicate Confirmation',
  CASH_CANCELLATION_ABUSE: 'Cash Cancellation Abuse',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#F59E0B',
  MEDIUM: '#F97316',
  HIGH: '#EF4444',
};

export default function FraudDetectionPage() {
  const navigate = useNavigate();
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolveModalFlag, setResolveModalFlag] = useState<FraudFlag | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchEntity, setSearchEntity] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [flagsRes, statsRes] = await Promise.all([
        api.get<FraudFlag[]>('/fraud/flags'),
        api.get<FraudStats>('/fraud/stats'),
      ]);
      setFlags(flagsRes.data);
      setStats(statsRes.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResolve = async () => {
    if (!resolveModalFlag) return;
    setResolving(true);
    try {
      await api.put(`/fraud/flags/${resolveModalFlag.id}/resolve`, {
        resolvedBy: 'admin',
        notes: resolveNotes,
      });
      setResolveModalFlag(null);
      setResolveNotes('');
      fetchData();
    } catch {
      /* silent */
    } finally {
      setResolving(false);
    }
  };

  const filteredFlags = flags.filter((f) => {
    if (filterSeverity && f.severity !== filterSeverity) return false;
    if (filterType && f.flagType !== filterType) return false;
    if (searchEntity) {
      const q = searchEntity.toLowerCase();
      if (
        !f.entityType.toLowerCase().includes(q) &&
        !String(f.entityId).includes(q) &&
        !f.description.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading fraud data...</div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              🛡️ Fraud Detection
            </h1>
            <span style={{ padding: '4px 12px', borderRadius: 20, background: '#7C3AED20', color: '#7C3AED', fontSize: 12, fontWeight: 600 }}>
              🤖 AI-Powered
            </span>
          </div>
          <p style={{ color: '#64748B', margin: '4px 0 0' }}>Machine learning models automatically detect suspicious patterns across rides, payments, and driver behavior</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#FEF2F2', borderRadius: 12, padding: 20, border: '1px solid #FECACA' }}>
            <div style={{ fontSize: 13, color: '#991B1B', fontWeight: 500 }}>Unresolved Flags</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#DC2626' }}>{stats.unresolvedFlags}</div>
          </div>
          <div style={{ background: '#F0FDF4', borderRadius: 12, padding: 20, border: '1px solid #BBF7D0' }}>
            <div style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>Resolved</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#16A34A' }}>{stats.resolvedFlags}</div>
          </div>
          <div style={{ background: '#EFF6FF', borderRadius: 12, padding: 20, border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: 13, color: '#1E40AF', fontWeight: 500 }}>Total Flags</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#2563EB' }}>{stats.totalFlags}</div>
          </div>
          <div style={{ background: '#FFFBEB', borderRadius: 12, padding: 20, border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>Repeat Offenders</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#D97706' }}>{stats.repeatOffenders.length}</div>
          </div>
        </div>
      )}

      {/* Flag Type Breakdown */}
      {stats && stats.flagsByType.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Flags by Type</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.flagsByType.map((ft) => (
              <div
                key={ft.flagType}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: '#F1F5F9',
                  fontSize: 13,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600 }}>{ft.count}</span>
                <span style={{ color: '#64748B' }}>{FLAG_TYPE_LABELS[ft.flagType] || ft.flagType}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repeat Offenders */}
      {stats && stats.repeatOffenders.length > 0 && (
        <div style={{ background: '#FEF2F2', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #FECACA' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: '#991B1B' }}>
            Repeat Offenders
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.repeatOffenders.map((ro, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: '#fff',
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 14 }}>
                  {ro.entityType} #{ro.entityId}
                </span>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: 12,
                    background: '#FEE2E2',
                    color: '#DC2626',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {ro.flagCount} flags
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search entity ID, type..."
          value={searchEntity}
          onChange={(e) => setSearchEntity(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            fontSize: 14,
            width: 220,
          }}
        />
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
        >
          <option value="">All Types</option>
          {Object.entries(FLAG_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Flags Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Severity</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Entity</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Description</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Ride</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFlags.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
                  No fraud flags found
                </td>
              </tr>
            ) : (
              filteredFlags.map((flag) => (
                <tr
                  key={flag.id}
                  style={{ borderBottom: '1px solid #F1F5F9' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {FLAG_TYPE_LABELS[flag.flagType] || flag.flagType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 12,
                        background: (SEVERITY_COLORS[flag.severity] || '#94A3B8') + '20',
                        color: SEVERITY_COLORS[flag.severity] || '#94A3B8',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {flag.severity}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: 500 }}>
                      {flag.entityType} #{flag.entityId}
                    </span>
                    {flag.relatedPaymentId && (
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>PAY{flag.relatedPaymentId}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 300, color: '#475569' }}>
                    {flag.description}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {flag.relatedRideId ? (
                      <button
                        onClick={() => navigate(`/rides/${flag.relatedRideId}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: 13,
                          padding: 0,
                        }}
                      >
                        HJ{flag.relatedRideId}
                      </button>
                    ) : (
                      <span style={{ color: '#CBD5E1' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B' }}>
                    {formatDate(flag.createdAt)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {!flag.resolved ? (
                      <button
                        onClick={() => setResolveModalFlag(flag)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 6,
                          background: '#2563EB',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Resolve
                      </button>
                    ) : (
                      <span style={{ color: '#16A34A', fontSize: 12, fontWeight: 500 }}>✓ Resolved</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Resolve Modal */}
      {resolveModalFlag && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setResolveModalFlag(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              width: 480,
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px' }}>Resolve Fraud Flag</h3>
            <div
              style={{
                padding: 12,
                background: '#F8FAFC',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {FLAG_TYPE_LABELS[resolveModalFlag.flagType] || resolveModalFlag.flagType}
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{resolveModalFlag.description}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                {resolveModalFlag.entityType} #{resolveModalFlag.entityId}
              </div>
            </div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Resolution Notes
            </label>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Describe the resolution action taken..."
              rows={4}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 14,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setResolveModalFlag(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: resolving ? '#94A3B8' : '#16A34A',
                  color: '#fff',
                  border: 'none',
                  cursor: resolving ? 'default' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {resolving ? 'Resolving...' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
