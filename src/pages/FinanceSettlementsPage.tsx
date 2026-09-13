import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { formatINR } from '../utils/formatCurrency';
import PermissionGate from '../components/PermissionGate';
import CloseButton from '../components/CloseButton';

interface FinanceDashboard {
  totalRides: number;
  totalGrossAmount: number;
  totalCompanyCommission: number;
  totalCommissionGst: number;
  totalDriverEarnings: number;
  ridesPending: number;
  ridesEligible: number;
  ridesProcessing: number;
  ridesSettled: number;
  ridesDisputed: number;
  ridesFailed: number;
  ridesOnHold: number;
  amountPending: number;
  amountEligible: number;
  amountProcessing: number;
  amountSettled: number;
  totalSettlements: number;
  totalSettledAmount: number;
  mismatchedRides: number;
  generatedAt: string;
}

interface SettlementRide {
  id: number;
  settlementId: number;
  rideFinancialId: number;
  rideId: number;
  amount: number;
}

interface Settlement {
  id: number;
  settlementReference: string;
  driverId: number;
  totalRides: number;
  grossAmount: number;
  commissionAmount: number;
  driverAmount: number;
  status: string;
  direction?: string;
  paymentReference?: string;
  idempotencyKey?: string;
  processedAt?: string;
  createdAt: string;
  rides?: SettlementRide[];
}

interface RideFinancial {
  id: number;
  rideId: number;
  driverId: number;
  driverName?: string;
  userId: number;
  paymentId?: number;
  grossFare: number;
  discountAmount: number;
  refundAmount: number;
  adjustmentAmount: number;
  finalCustomerAmount: number;
  companyCommission: number;
  commissionGstAmount: number;
  commissionRate: number;
  driverEarnings: number;
  paymentMethod?: string;
  paymentCollector?: string;
  settlementDirection?: string;
  settlementAmount?: number;
  paymentStatus?: string;
  settlementStatus: string;
  reconciliationStatus?: string;
  settlementId?: number;
  completedAt?: string;
  settledAt?: string;
  createdAt: string;
}

interface LedgerEntry {
  id: number;
  driverId: number;
  rideId?: number;
  transactionType: string;
  creditAmount: number;
  debitAmount: number;
  balanceAfter: number;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

interface DriverOption {
  id: number;
  name: string;
  phoneNumber: string;
}

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface SortState {
  field: string;
  dir: 'asc' | 'desc';
}

interface RideFilter {
  search: string;
  rideId: string;
  driverId: string;
  paymentStatus: string;
  settlementStatus: string;
  paymentMethod: string;
  rideStatus: string;
  paymentCollector: string;
  settlementDirection: string;
  from: string;
  to: string;
  sort: SortState;
}

interface SettlementFilter {
  search: string;
  driverId: string;
  status: string;
  from: string;
  to: string;
  sort: SortState;
}

interface ModalState {
  createBatch: boolean;
  reconcile: { rideId: number; result: Record<string, unknown> } | null;
  adjustDriver: { driverId: number } | null;
  adjustCompany: { rideId: number } | null;
  resolveDispute: { rideId: number } | null;
  settlementDetail: Settlement | null;
}

const EMPTY_MODALS: ModalState = { createBatch: false, reconcile: null, adjustDriver: null, adjustCompany: null, resolveDispute: null, settlementDetail: null };

const emptyRideFilter = (): RideFilter => ({
  search: '', rideId: '', driverId: '', paymentStatus: '', settlementStatus: '', paymentMethod: '',
  rideStatus: '', paymentCollector: '', settlementDirection: '', from: '', to: '', sort: { field: 'createdAt', dir: 'desc' },
});

const PAYMENT_COLLECTOR_OPTIONS = ['DRIVER', 'COMPANY'];
const SETTLEMENT_DIRECTION_OPTIONS = ['DRIVER_TO_COMPANY', 'COMPANY_TO_DRIVER', 'NONE'];

// Human-readable label + colour for the settlement direction so the admin sees
// "who owes whom" at a glance rather than a raw enum.
const directionLabel = (d?: string): string => {
  if (d === 'DRIVER_TO_COMPANY') return 'Driver → Company';
  if (d === 'COMPANY_TO_DRIVER') return 'Company → Driver';
  if (d === 'NONE') return 'None';
  return '-';
};
const directionColor = (d?: string): string => {
  if (d === 'DRIVER_TO_COMPANY') return '#E65100';
  if (d === 'COMPANY_TO_DRIVER') return '#1565C0';
  return '#9E9E9E';
};

const emptySettlementFilter = (): SettlementFilter => ({
  search: '', driverId: '', status: '', from: '', to: '', sort: { field: 'createdAt', dir: 'desc' },
});

const RIDE_STATUS_COLORS: Record<string, string> = {
  PENDING: '#FFC107', ELIGIBLE: '#2196F3', PROCESSING: '#7E57C2',
  SETTLED: '#4CAF50', DISPUTED: '#E91E63', FAILED: '#F44336',
  ON_HOLD: '#FF9800', REVERSED: '#9E9E9E',
};

const SETTLE_STATUS_COLORS: Record<string, string> = {
  PENDING: '#FFC107', PROCESSING: '#2196F3', SETTLED: '#4CAF50',
  FAILED: '#F44336', ON_HOLD: '#FF9800', REVERSED: '#9E9E9E',
};

const PAYMENT_STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'PENDING_USER_CONFIRMATION', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'DISPUTED'];
const SETTLEMENT_STATUS_OPTIONS = ['PENDING', 'ELIGIBLE', 'PROCESSING', 'SETTLED', 'FAILED', 'ON_HOLD', 'DISPUTED', 'REVERSED'];
const PAYMENT_METHOD_OPTIONS = ['CASH', 'UPI', 'CARD', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET', 'RAZORPAY'];
const RIDE_STATUS_OPTIONS = ['REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'NO_DRIVERS_AVAILABLE'];

const RIDE_SORTABLE = ['rideId', 'driverId', 'grossFare', 'companyCommission', 'commissionGstAmount', 'driverEarnings', 'paymentMethod', 'paymentCollector', 'settlementDirection', 'settlementAmount', 'paymentStatus', 'settlementStatus', 'createdAt'];
const SETTLEMENT_SORTABLE = ['settlementReference', 'driverId', 'totalRides', 'grossAmount', 'commissionAmount', 'driverAmount', 'status', 'createdAt'];

const thStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, fontWeight: 600, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13 };
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #DDD', borderRadius: 6, fontSize: 13, background: '#fff',
};
const selectStyle: React.CSSProperties = { ...inputStyle, padding: '8px 10px' };
const smallBtn = (bg: string, color: string): React.CSSProperties => ({
  padding: '4px 8px', background: bg, color, border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer',
});
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60,
};
const modalContent: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 640,
  boxShadow: '0 8px 30px rgba(0,0,0,0.2)', maxHeight: '80vh', overflow: 'auto',
};

export default function FinanceSettlementsPage() {
  const [tab, setTab] = useState<'batches' | 'rides' | 'ledger'>('batches');
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [settlements, setSettlements] = useState<Page<Settlement>>({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  const [rides, setRides] = useState<Page<RideFinancial>>({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  const [ledger, setLedger] = useState<Page<LedgerEntry>>({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  const [ledgerBalance, setLedgerBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [settlePage, setSettlePage] = useState(1);
  const [ridesPage, setRidesPage] = useState(1);

  const [settleFilter, setSettleFilter] = useState<SettlementFilter>(emptySettlementFilter());
  const [settleDraft, setSettleDraft] = useState<SettlementFilter>(emptySettlementFilter());

  const [rideFilter, setRideFilter] = useState<RideFilter>(emptyRideFilter());
  const [rideDraft, setRideDraft] = useState<RideFilter>(emptyRideFilter());

  const [ledgerDriverId, setLedgerDriverId] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);

  const [modals, setModals] = useState<ModalState>(EMPTY_MODALS);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get<FinanceDashboard>('/finance/dashboard');
      setDashboard(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to load finance dashboard');
    }
  }, []);

  const fetchSettlements = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page: settlePage - 1, size: 20 };
      const f = settleFilter;
      if (f.search.trim()) params.search = f.search.trim();
      if (f.driverId.trim()) params.driverId = Number(f.driverId);
      if (f.status) params.status = f.status;
      if (f.from) params.from = f.from;
      if (f.to) params.to = f.to;
      params.sort = `${f.sort.field},${f.sort.dir}`;
      const res = await api.get<Page<Settlement>>('/finance/settlements', { params });
      setSettlements(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to load settlements');
    }
  }, [settlePage, settleFilter]);

  const fetchRides = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page: ridesPage - 1, size: 20 };
      const f = rideFilter;
      if (f.search.trim()) params.search = f.search.trim();
      if (f.rideId.trim()) params.rideId = Number(f.rideId);
      if (f.driverId.trim()) params.driverId = Number(f.driverId);
      if (f.paymentStatus) params.paymentStatus = f.paymentStatus;
      if (f.settlementStatus) params.settlementStatus = f.settlementStatus;
      if (f.paymentMethod) params.paymentMethod = f.paymentMethod;
      if (f.rideStatus) params.rideStatus = f.rideStatus;
      if (f.paymentCollector) params.paymentCollector = f.paymentCollector;
      if (f.settlementDirection) params.settlementDirection = f.settlementDirection;
      if (f.from) params.from = f.from;
      if (f.to) params.to = f.to;
      params.sort = `${f.sort.field},${f.sort.dir}`;
      const res = await api.get<Page<RideFinancial>>('/finance/rides', { params });
      setRides(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to load ride financials');
    }
  }, [ridesPage, rideFilter]);

  const fetchLedger = useCallback(async () => {
    const driverId = ledgerDriverId.trim();
    if (!driverId) return;
    try {
      const res = await api.get<Page<LedgerEntry>>('/finance/driver-ledger', {
        params: { driverId, page: ledgerPage - 1, size: 20 },
      });
      setLedger(res.data);
      const latest = res.data.content[0];
      if (latest) setLedgerBalance(latest.balanceAfter);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to load driver ledger');
    }
  }, [ledgerDriverId, ledgerPage]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchSettlements(), fetchRides()]).finally(() => setLoading(false));
  }, [fetchDashboard, fetchSettlements, fetchRides]);

  const refreshAll = () => {
    setError('');
    fetchDashboard();
    fetchSettlements();
    fetchRides();
    if (ledgerDriverId.trim()) fetchLedger();
  };

  const buildCsvParams = (params: Record<string, unknown>): Record<string, string | number> =>
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined) as [string, string | number][],
    );

  const downloadCsv = async (url: string, filename: string, params?: Record<string, string | number>) => {
    try {
      const res = await api.get(url, { params, responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to export CSV');
    }
  };

  const exportRidesCsv = () => {
    const f = rideFilter;
    downloadCsv('/finance/reports/ride-financials.csv', 'ride-financials.csv', buildCsvParams({
      search: f.search.trim(), rideId: f.rideId.trim(), driverId: f.driverId.trim(),
      paymentStatus: f.paymentStatus, settlementStatus: f.settlementStatus, paymentMethod: f.paymentMethod,
      rideStatus: f.rideStatus, paymentCollector: f.paymentCollector, settlementDirection: f.settlementDirection,
      from: f.from, to: f.to,
    }));
  };

  const exportSettlementsCsv = () => {
    const f = settleFilter;
    downloadCsv('/finance/reports/settlements.csv', 'settlements.csv', buildCsvParams({
      search: f.search.trim(), driverId: f.driverId.trim(), status: f.status, from: f.from, to: f.to,
    }));
  };

  const action = async (fn: () => Promise<unknown>, onDone: () => void) => {
    setError('');
    try {
      await fn();
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.error || err?.message || 'Action failed');
    }
  };

  const renderPullButton = (label: string, color: string, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '6px 14px', background: color, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{label}</button>
  );

  const applyRideFilters = () => {
    setRideFilter(rideDraft);
    setRidesPage(1);
  };

  const clearRideFilters = () => {
    setRideDraft(emptyRideFilter());
    setRideFilter(emptyRideFilter());
    setRidesPage(1);
  };

  const applySettlementFilters = () => {
    setSettleFilter(settleDraft);
    setSettlePage(1);
  };

  const clearSettlementFilters = () => {
    setSettleDraft(emptySettlementFilter());
    setSettleFilter(emptySettlementFilter());
    setSettlePage(1);
  };

  const sortRides = (field: string) => {
    setRideFilter((f) => {
      const dir = f.sort.field === field && f.sort.dir === 'asc' ? 'desc' : 'asc';
      return { ...f, sort: { field, dir } };
    });
    setRidesPage(1);
  };

  const sortSettlements = (field: string) => {
    setSettleFilter((f) => {
      const dir = f.sort.field === field && f.sort.dir === 'asc' ? 'desc' : 'asc';
      return { ...f, sort: { field, dir } };
    });
    setSettlePage(1);
  };

  const rideChips: { key: string; label: string }[] = [];
  if (rideFilter.search.trim()) rideChips.push({ key: 'search', label: `Search: ${rideFilter.search.trim()}` });
  if (rideFilter.rideId.trim()) rideChips.push({ key: 'rideId', label: `Ride: ${rideFilter.rideId.trim()}` });
  if (rideFilter.driverId.trim()) rideChips.push({ key: 'driverId', label: `Driver: ${rideFilter.driverId.trim()}` });
  if (rideFilter.paymentStatus) rideChips.push({ key: 'paymentStatus', label: `Payment: ${rideFilter.paymentStatus}` });
  if (rideFilter.settlementStatus) rideChips.push({ key: 'settlementStatus', label: `Settlement: ${rideFilter.settlementStatus}` });
  if (rideFilter.paymentMethod) rideChips.push({ key: 'paymentMethod', label: `Method: ${rideFilter.paymentMethod}` });
  if (rideFilter.rideStatus) rideChips.push({ key: 'rideStatus', label: `Ride Status: ${rideFilter.rideStatus}` });
  if (rideFilter.paymentCollector) rideChips.push({ key: 'paymentCollector', label: `Collected By: ${rideFilter.paymentCollector}` });
  if (rideFilter.settlementDirection) rideChips.push({ key: 'settlementDirection', label: `Direction: ${directionLabel(rideFilter.settlementDirection)}` });
  if (rideFilter.from) rideChips.push({ key: 'from', label: `From: ${rideFilter.from}` });
  if (rideFilter.to) rideChips.push({ key: 'to', label: `To: ${rideFilter.to}` });

  const settlementChips: { key: string; label: string }[] = [];
  if (settleFilter.search.trim()) settlementChips.push({ key: 'search', label: `Search: ${settleFilter.search.trim()}` });
  if (settleFilter.driverId.trim()) settlementChips.push({ key: 'driverId', label: `Driver: ${settleFilter.driverId.trim()}` });
  if (settleFilter.status) settlementChips.push({ key: 'status', label: `Status: ${settleFilter.status}` });
  if (settleFilter.from) settlementChips.push({ key: 'from', label: `From: ${settleFilter.from}` });
  if (settleFilter.to) settlementChips.push({ key: 'to', label: `To: ${settleFilter.to}` });

  if (loading && !dashboard && !error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <p style={{ color: '#757575', fontSize: 14 }}>Loading finance data...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24 }}>Settlements &amp; Finance</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <PermissionGate permission="REPORTS_VIEW">
            <button onClick={exportRidesCsv}
              style={{ padding: '6px 12px', background: '#E3F2FD', color: '#1565C0', border: '1px solid #BBDEFB', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Export Rides CSV</button>
            <button onClick={exportSettlementsCsv}
              style={{ padding: '6px 12px', background: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Export Settlements CSV</button>
          </PermissionGate>
          <button onClick={refreshAll} style={{ padding: '6px 14px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
          <MetricCard label="Total Gross" value={formatINR(dashboard.totalGrossAmount)} color="#1E88E5" />
          <MetricCard label="Company Commission" value={formatINR(dashboard.totalCompanyCommission)} color="#388E3C" />
          <MetricCard label="GST (est.)" value={formatINR(dashboard.totalCommissionGst)} color="#FF6D00" />
          <MetricCard label="Driver Earnings" value={formatINR(dashboard.totalDriverEarnings)} color="#9C27B0" />
          <MetricCard label="Eligible Rides" value={`${dashboard.ridesEligible}`} color="#2196F3" />
          <MetricCard label="Eligible Amount" value={formatINR(dashboard.amountEligible)} color="#2196F3" />
          <MetricCard label="Settled Rides" value={`${dashboard.ridesSettled}`} color="#4CAF50" />
          <MetricCard label="Settled Amount" value={formatINR(dashboard.totalSettledAmount)} color="#4CAF50" />
          <MetricCard label="Disputed Rides" value={`${dashboard.ridesDisputed}`} color="#E91E63" />
          <MetricCard label="Processing" value={`${dashboard.ridesProcessing}`} color="#7E57C2" />
          <MetricCard label="Total Settlements" value={`${dashboard.totalSettlements}`} color="#FF9800" />
          <MetricCard label="Mismatches" value={`${dashboard.mismatchedRides}`} color={dashboard.mismatchedRides > 0 ? '#F44336' : '#9E9E9E'} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #E5E5E5', paddingBottom: 0 }}>
        {([
          ['batches', 'Settlement Batches'],
          ['rides', 'Ride Financials'],
          ['ledger', 'Driver Ledger'],
        ] as const).map(([key, label]) => (
          <button key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 18px', border: 'none', borderBottom: tab === key ? '3px solid #1E88E5' : '3px solid transparent',
              background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tab === key ? 700 : 500,
              color: tab === key ? '#1E88E5' : '#616161',
            }}>{label}</button>
        ))}
      </div>

      {tab === 'batches' && (
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Search ref / id" value={settleDraft.search}
              onChange={(e) => setSettleDraft((d) => ({ ...d, search: e.target.value }))} style={{ ...inputStyle, width: 200 }} />
            <input type="text" placeholder="Driver ID" value={settleDraft.driverId}
              onChange={(e) => setSettleDraft((d) => ({ ...d, driverId: e.target.value }))} style={{ ...inputStyle, width: 120 }} />
            <select value={settleDraft.status} onChange={(e) => setSettleDraft((d) => ({ ...d, status: e.target.value }))} style={selectStyle}>
              <option value="">All Status</option>
              {['PENDING', 'PROCESSING', 'SETTLED', 'FAILED', 'ON_HOLD', 'REVERSED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={settleDraft.from} onChange={(e) => setSettleDraft((d) => ({ ...d, from: e.target.value }))} style={inputStyle} title="From date" />
            <input type="date" value={settleDraft.to} onChange={(e) => setSettleDraft((d) => ({ ...d, to: e.target.value }))} style={inputStyle} title="To date" />
            <button onClick={applySettlementFilters} style={{ padding: '8px 16px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Apply</button>
            <button onClick={clearSettlementFilters} style={{ padding: '8px 14px', background: '#fff', color: '#616161', border: '1px solid #CCC', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Clear</button>
            <PermissionGate permission="SETTLEMENTS_CREATE">
              {renderPullButton('+ New Settlement Batch', '#1E88E5', () => setModals((m) => ({ ...m, createBatch: true })))}
            </PermissionGate>
          </div>

          {settlementChips.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {settlementChips.map((c) => (
                <span key={c.key} style={{ padding: '3px 10px', background: '#E3F2FD', color: '#1565C0', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{c.label}</span>
              ))}
            </div>
          )}

          {settlements.content.length === 0 ? (
            <p style={{ color: '#757575' }}>No settlement batches found. Confirm a company-collected payment and create a batch.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={thStyle}><SortHeader label="Reference" field="settlementReference" sort={settleFilter.sort} onSort={sortSettlements} /></th>
                    <th style={thStyle}><SortHeader label="Driver ID" field="driverId" sort={settleFilter.sort} onSort={sortSettlements} /></th>
                    <th style={thStyle}><SortHeader label="Rides" field="totalRides" sort={settleFilter.sort} onSort={sortSettlements} /></th>
                    <th style={thStyle}><SortHeader label="Gross" field="grossAmount" sort={settleFilter.sort} onSort={sortSettlements} /></th>
                    <th style={thStyle}><SortHeader label="Commission" field="commissionAmount" sort={settleFilter.sort} onSort={sortSettlements} /></th>
                    <th style={thStyle}><SortHeader label="Driver Amount" field="driverAmount" sort={settleFilter.sort} onSort={sortSettlements} /></th>
                    <th style={thStyle}>Direction</th>
                    <th style={thStyle}><SortHeader label="Status" field="status" sort={settleFilter.sort} onSort={sortSettlements} /></th>
                    <th style={thStyle}>Payment Ref</th>
                    <th style={thStyle}><SortHeader label="Created" field="createdAt" sort={settleFilter.sort} onSort={sortSettlements} /></th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.content.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{s.settlementReference}</td>
                      <td style={tdStyle}>{s.driverId}</td>
                      <td style={tdStyle}>{s.totalRides}</td>
                      <td style={tdStyle}>{formatINR(s.grossAmount)}</td>
                      <td style={tdStyle}>{formatINR(s.commissionAmount)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#2E7D32' }}>{formatINR(s.driverAmount)}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: directionColor(s.direction) }}>{directionLabel(s.direction)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: SETTLE_STATUS_COLORS[s.status] || '#9E9E9E' }}>{s.status}</span>
                      </td>
                      <td style={tdStyle}>{s.paymentReference || '-'}</td>
                      <td style={{ ...tdStyle, color: '#757575' }}>{formatDate(s.createdAt)}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button onClick={() => handleSettlementDetail(s.id)} style={smallBtn('#E3F2FD', '#1565C0')}>Detail</button>
                          <PermissionGate permission="SETTLEMENTS_PROCESS">
                            {s.status === 'PENDING' && (
                              <button onClick={() => handleProcessSettle(s.id, 'process')} style={smallBtn('#7E57C2', '#fff')}>Process</button>
                            )}
                            {s.status === 'PROCESSING' && (
                              <button onClick={() => handleProcessSettle(s.id, 'settle')} style={smallBtn('#2E7D32', '#fff')}>Settle</button>
                            )}
                          </PermissionGate>
                          <PermissionGate permission="SETTLEMENTS_REVERT">
                            {(s.status === 'PENDING' || s.status === 'PROCESSING') && (
                              <button onClick={() => handleRevert(s.id)} style={smallBtn('#FFF3E0', '#E65100')}>Revert</button>
                            )}
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PaginationBar page={settlePage} totalElements={settlements.totalElements} pageSize={settlements.size}
            onPrev={() => setSettlePage((p) => Math.max(1, p - 1))}
            onNext={() => setSettlePage((p) => p + 1)}
            hasMore={(settlements.content.length) === (settlements.size)} />
        </div>
      )}

      {tab === 'rides' && (
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Search ride / driver / user / ref" value={rideDraft.search}
              onChange={(e) => setRideDraft((d) => ({ ...d, search: e.target.value }))} style={{ ...inputStyle, width: 220 }} />
            <input type="text" placeholder="Ride ID" value={rideDraft.rideId}
              onChange={(e) => setRideDraft((d) => ({ ...d, rideId: e.target.value }))} style={{ ...inputStyle, width: 110 }} />
            <DriverFilter value={rideDraft.driverId} onChange={(id) => setRideDraft((d) => ({ ...d, driverId: id }))} />
            <select value={rideDraft.paymentStatus} onChange={(e) => setRideDraft((d) => ({ ...d, paymentStatus: e.target.value }))} style={selectStyle}>
              <option value="">All Payments</option>
              {PAYMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={rideDraft.settlementStatus} onChange={(e) => setRideDraft((d) => ({ ...d, settlementStatus: e.target.value }))} style={selectStyle}>
              <option value="">All Settlements</option>
              {SETTLEMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={rideDraft.paymentMethod} onChange={(e) => setRideDraft((d) => ({ ...d, paymentMethod: e.target.value }))} style={selectStyle}>
              <option value="">All Methods</option>
              {PAYMENT_METHOD_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={rideDraft.rideStatus} onChange={(e) => setRideDraft((d) => ({ ...d, rideStatus: e.target.value }))} style={selectStyle}>
              <option value="">All Ride Status</option>
              {RIDE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={rideDraft.paymentCollector} onChange={(e) => setRideDraft((d) => ({ ...d, paymentCollector: e.target.value }))} style={selectStyle} title="Who collected the payment">
              <option value="">All Collectors</option>
              {PAYMENT_COLLECTOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={rideDraft.settlementDirection} onChange={(e) => setRideDraft((d) => ({ ...d, settlementDirection: e.target.value }))} style={selectStyle} title="Settlement direction">
              <option value="">All Directions</option>
              {SETTLEMENT_DIRECTION_OPTIONS.map((s) => <option key={s} value={s}>{directionLabel(s)}</option>)}
            </select>
            <input type="date" value={rideDraft.from} onChange={(e) => setRideDraft((d) => ({ ...d, from: e.target.value }))} style={inputStyle} title="From date" />
            <input type="date" value={rideDraft.to} onChange={(e) => setRideDraft((d) => ({ ...d, to: e.target.value }))} style={inputStyle} title="To date" />
            <button onClick={applyRideFilters} style={{ padding: '8px 16px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Apply</button>
            <button onClick={clearRideFilters} style={{ padding: '8px 14px', background: '#fff', color: '#616161', border: '1px solid #CCC', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Clear</button>
          </div>

          {rideChips.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {rideChips.map((c) => (
                <span key={c.key} style={{ padding: '3px 10px', background: '#E3F2FD', color: '#1565C0', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{c.label}</span>
              ))}
            </div>
          )}

          {rides.content.length === 0 ? (
            <p style={{ color: '#757575' }}>No ride financial records found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: 1100 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={thStyle}><SortHeader label="Ride" field="rideId" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}><SortHeader label="Driver ID" field="driverId" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}>Driver Name</th>
                    <th style={thStyle}><SortHeader label="Gross Fare" field="grossFare" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}>Discount</th>
                    <th style={thStyle}><SortHeader label="Commission" field="companyCommission" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}><SortHeader label="GST" field="commissionGstAmount" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}><SortHeader label="Driver Earnings" field="driverEarnings" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}><SortHeader label="Method" field="paymentMethod" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}><SortHeader label="Collected By" field="paymentCollector" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}><SortHeader label="Settlement Dir." field="settlementDirection" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}>Settle Amt</th>
                    <th style={thStyle}><SortHeader label="Payment" field="paymentStatus" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}><SortHeader label="Settlement" field="settlementStatus" sort={rideFilter.sort} onSort={sortRides} /></th>
                    <th style={thStyle}>Recon.</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.content.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.rideId}</td>
                      <td style={tdStyle}>{r.driverId}</td>
                      <td style={tdStyle}>{r.driverName || '-'}</td>
                      <td style={tdStyle}>{formatINR(r.grossFare)}</td>
                      <td style={tdStyle}>{formatINR(r.discountAmount)}</td>
                      <td style={tdStyle}>{formatINR(r.companyCommission)}</td>
                      <td style={tdStyle}>{formatINR(r.commissionGstAmount)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#2E7D32' }}>{formatINR(r.driverEarnings)}</td>
                      <td style={tdStyle}>{r.paymentMethod || '-'}</td>
                      <td style={tdStyle}>
                        {r.paymentCollector
                          ? <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#fff', background: r.paymentCollector === 'DRIVER' ? '#6A1B9A' : '#00838F' }}>{r.paymentCollector}</span>
                          : '-'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: directionColor(r.settlementDirection) }}>{directionLabel(r.settlementDirection)}</span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.settlementAmount != null ? formatINR(r.settlementAmount) : '-'}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: (r.paymentStatus === 'SUCCESS' ? '#4CAF50' : r.paymentStatus === 'REFUNDED' ? '#FF6D00' : r.paymentStatus === 'DISPUTED' ? '#E91E63' : '#FFC107') }}>{r.paymentStatus || '-'}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: RIDE_STATUS_COLORS[r.settlementStatus] || '#9E9E9E' }}>{r.settlementStatus}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: r.reconciliationStatus === 'MATCHED' ? '#2E7D32' : '#E65100', background: r.reconciliationStatus === 'MATCHED' ? '#E8F5E9' : '#FFF3E0' }}>{r.reconciliationStatus || '-'}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button onClick={() => handleReconcile(r.rideId)} style={smallBtn('#E3F2FD', '#1565C0')}>Reconcile</button>
                          <PermissionGate permission="FINANCE_ADJUST">
                            <button onClick={() => setModals((m) => ({ ...m, adjustDriver: { driverId: r.driverId } }))} style={smallBtn('#F3E5F5', '#6A1B9A')}>Adj. Driver</button>
                            <button onClick={() => setModals((m) => ({ ...m, adjustCompany: { rideId: r.rideId } }))} style={smallBtn('#FFF3E0', '#E65100')}>Adj. Company</button>
                          </PermissionGate>
                          <PermissionGate permission="DISPUTES_RESOLVE">
                            {r.settlementStatus === 'DISPUTED' && (
                              <button onClick={() => setModals((m) => ({ ...m, resolveDispute: { rideId: r.rideId } }))} style={smallBtn('#E91E63', '#fff')}>Resolve</button>
                            )}
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PaginationBar page={ridesPage} totalElements={rides.totalElements} pageSize={rides.size}
            onPrev={() => setRidesPage((p) => Math.max(1, p - 1))}
            onNext={() => setRidesPage((p) => p + 1)}
            hasMore={rides.content.length === rides.size} />
        </div>
      )}

      {tab === 'ledger' && (
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Driver ID" value={ledgerDriverId} onChange={(e) => { setLedgerDriverId(e.target.value); setLedgerPage(1); }} style={{ ...inputStyle, width: 130 }} />
            {renderPullButton('Load Ledger', '#1E88E5', fetchLedger)}
            {ledgerBalance !== null && (
              <span style={{ fontSize: 14, color: '#616161' }}>
                Current balance: <strong style={{ color: ledgerBalance >= 0 ? '#2E7D32' : '#C62828' }}>{formatINR(ledgerBalance)}</strong>
              </span>
            )}
          </div>

          {!ledgerDriverId.trim() ? (
            <p style={{ color: '#757575' }}>Enter a driver ID to view their append-only earnings ledger.</p>
          ) : ledger.content.length === 0 ? (
            <p style={{ color: '#757575' }}>No ledger entries for this driver yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Ride</th>
                    <th style={thStyle}>Credit</th>
                    <th style={thStyle}>Debit</th>
                    <th style={thStyle}>Balance</th>
                    <th style={thStyle}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.content.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                      <td style={{ ...tdStyle, color: '#757575' }}>{formatDate(e.createdAt)}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#fff', background: e.transactionType === 'RIDE_COMMISSION' || e.transactionType === 'SETTLEMENT' || e.transactionType === 'REVERSAL' || e.transactionType === 'ADJUSTMENT_DEBIT' ? '#E65100' : '#2E7D32' }}>{e.transactionType}</span>
                      </td>
                      <td style={tdStyle}>{e.rideId || '-'}</td>
                      <td style={{ ...tdStyle, color: '#2E7D32', fontWeight: 600 }}>{e.creditAmount > 0 ? formatINR(e.creditAmount) : '-'}</td>
                      <td style={{ ...tdStyle, color: '#C62828', fontWeight: 600 }}>{e.debitAmount > 0 ? formatINR(e.debitAmount) : '-'}</td>
                      <td style={tdStyle}>{formatINR(e.balanceAfter)}</td>
                      <td style={{ ...tdStyle, color: '#616161' }}>{e.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PaginationBar page={ledgerPage} totalElements={ledger.totalElements} pageSize={ledger.size}
            onPrev={() => setLedgerPage((p) => Math.max(1, p - 1))}
            onNext={() => setLedgerPage((p) => p + 1)}
            hasMore={ledger.content.length === ledger.size} />
        </div>
      )}

      {modals.createBatch && (
        <CreateBatchModal
          onClose={() => setModals((m) => ({ ...m, createBatch: false }))}
          onDone={() => { setModals((m) => ({ ...m, createBatch: false })); refreshAll(); }}
        />
      )}

      {modals.reconcile && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>Reconciliation — Ride {modals.reconcile.rideId}</h2>
              <CloseButton onClick={() => setModals((m) => ({ ...m, reconcile: null }))} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Object.entries(modals.reconcile.result).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #EEE' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</td>
                    <td style={tdStyle}>{formatValue(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setModals((m) => ({ ...m, reconcile: null }))} style={smallBtn('#ECEFF1', '#37474F')}>Close</button>
            </div>
          </div>
        </div>
      )}

      {modals.adjustDriver && (
        <AdjustModal
          title={`Adjust Driver Ledger — Driver ${modals.adjustDriver.driverId}`}
          fields={[{ key: 'rideId', label: 'Ride ID (optional)', placeholder: 'Optional' }]}
          siteLabel="Driver"
          submitLabel="Post Adjustment"
          onSubmit={async (values) => {
            const amount = Number(values.amount);
            if (!isFinite(amount) || amount === 0) throw new Error('Enter a non-zero amount (positive = credit, negative = debit)');
            await api.post(`/finance/drivers/${modals.adjustDriver!.driverId}/adjust`, {
              amount: String(amount),
              reason: values.reason || 'Admin adjustment',
              rideId: values.rideId || '',
            });
          }}
          onClose={() => setModals((m) => ({ ...m, adjustDriver: null }))}
          onDone={() => { setModals((m) => ({ ...m, adjustDriver: null })); refreshAll(); }}
        />
      )}

      {modals.adjustCompany && (
        <AdjustModal
          title={`Adjust Company Ledger — Ride ${modals.adjustCompany.rideId}`}
          fields={[]}
          siteLabel="Company"
          submitLabel="Post Adjustment"
          onSubmit={async (values) => {
            const amount = Number(values.amount);
            if (!isFinite(amount) || amount === 0) throw new Error('Enter a non-zero amount (positive = credit, negative = debit)');
            await api.post(`/finance/rides/${modals.adjustCompany!.rideId}/adjust-company`, {
              amount: String(amount),
              reason: values.reason || 'Admin adjustment',
            });
          }}
          onClose={() => setModals((m) => ({ ...m, adjustCompany: null }))}
          onDone={() => { setModals((m) => ({ ...m, adjustCompany: null })); refreshAll(); }}
        />
      )}

      {modals.resolveDispute && (
        <ResolveDisputeModal
          rideId={modals.resolveDispute.rideId}
          onClose={() => setModals((m) => ({ ...m, resolveDispute: null }))}
          onDone={() => { setModals((m) => ({ ...m, resolveDispute: null })); refreshAll(); }}
        />
      )}

      {modals.settlementDetail && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 720 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>Settlement {modals.settlementDetail.settlementReference}</h2>
              <CloseButton onClick={() => setModals((m) => ({ ...m, settlementDetail: null }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
              <SummaryItem label="Status" value={modals.settlementDetail.status} />
              <SummaryItem label="Driver ID" value={String(modals.settlementDetail.driverId)} />
              <SummaryItem label="Rides" value={String(modals.settlementDetail.totalRides)} />
              <SummaryItem label="Gross" value={formatINR(modals.settlementDetail.grossAmount)} />
              <SummaryItem label="Commission" value={formatINR(modals.settlementDetail.commissionAmount)} />
              <SummaryItem label="Driver Amount" value={formatINR(modals.settlementDetail.driverAmount)} />
              <SummaryItem label="Payment Ref" value={modals.settlementDetail.paymentReference || '-'} />
              <SummaryItem label="Created" value={formatDate(modals.settlementDetail.createdAt)} />
            </div>
            {modals.settlementDetail.rides && modals.settlementDetail.rides.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={thStyle}>Ride ID</th>
                    <th style={thStyle}>Ride Financial ID</th>
                    <th style={thStyle}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {modals.settlementDetail.rides.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #EEE' }}>
                      <td style={tdStyle}>{r.rideId}</td>
                      <td style={tdStyle}>{r.rideFinancialId}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#2E7D32' }}>{formatINR(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setModals((m) => ({ ...m, settlementDetail: null }))} style={smallBtn('#ECEFF1', '#37474F')}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function handleReconcile(rideId: number) {
    setError('');
    try {
      const res = await api.get<Record<string, unknown>>(`/finance/reconcile/${rideId}`);
      setModals((m) => ({ ...m, reconcile: { rideId, result: res.data } }));
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Reconciliation failed');
    }
  }

  async function handleSettlementDetail(id: number) {
    setError('');
    try {
      const res = await api.get<Settlement>(`/finance/settlements/${id}`);
      setModals((m) => ({ ...m, settlementDetail: res.data }));
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to load settlement detail');
    }
  }

  function handleProcessSettle(id: number, step: 'process' | 'settle') {
    const paymentReference = (window.prompt(`Payment reference / UTR for ${step === 'process' ? 'processing' : 'settling'} this batch:`) || '').trim();
    action(async () => {
      await api.post(`/finance/settlements/${id}/${step}`, { paymentReference });
    }, refreshAll);
  }

  function handleRevert(id: number) {
    if (!window.confirm('Revert this settlement batch? Its rides will become ELIGIBLE again.')) return;
    action(async () => {
      await api.post(`/finance/settlements/${id}/revert`);
    }, refreshAll);
  }

  function formatValue(v: unknown): string {
    if (v === null || v === undefined) return '-';
    if (typeof v === 'number') return formatINR(v);
    if (typeof v === 'boolean') return String(v);
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }
}

function SortHeader({ label, field, sort, onSort }: {
  label: string; field: string; sort: SortState; onSort: (field: string) => void;
}) {
  const active = sort.field === field;
  const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  return (
    <span
      onClick={() => onSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', color: active ? '#1E88E5' : '#212121' }}
      title={`Sort by ${label}`}>
      {label}{arrow}
    </span>
  );
}

function DriverFilter({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get<DriverOption[]>('/drivers?size=500&sort=name')
      .then((res) => {
        if (cancelled) return;
        // /api/v1/admin/drivers is paginated ({drivers:[...]}); tolerate a raw array too.
        const data = Array.isArray(res.data) ? res.data : (res.data as { drivers?: DriverOption[] }).drivers ?? [];
        setDrivers(data);
      })
      .catch(() => { /* ignore; free-text Driver ID field remains available */ });
    return () => { cancelled = true; };
  }, []);

  const selected = drivers.find((d) => d.id.toString() === value);
  const filtered = drivers
    .filter((d) => {
      const q = query.toLowerCase();
      return !q || d.name.toLowerCase().includes(q) || d.phoneNumber.includes(q) || d.id.toString().includes(q);
    })
    .slice(0, 50);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={selected ? `#${selected.id} — ${selected.name}` : 'Driver name / phone / id'}
        value={selected ? '' : query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onClick={(e) => e.stopPropagation()}
        style={{ ...inputStyle, width: 210 }} />
      {value && (
        <span
          onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#C62828', fontSize: 14 }}>✕</span>
      )}
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, background: '#fff', border: '1px solid #DDD', borderRadius: 6, marginTop: 4, maxHeight: 260, overflowY: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', color: '#9E9E9E', fontSize: 13 }}>No drivers found</div>
          ) : (
            filtered.map((d) => (
              <div
                key={d.id}
                onClick={(e) => { e.stopPropagation(); onChange(d.id.toString()); setOpen(false); setQuery(''); }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{d.name}</span>
                <span style={{ color: '#757575' }}>#{d.id} · {d.phoneNumber}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(value?: string): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 18, borderLeft: `4px solid ${color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <p style={{ fontSize: 12, color: '#757575', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#FAFAFA', borderRadius: 8, padding: '10px 12px' }}>
      <p style={{ fontSize: 11, color: '#757575', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#212121' }}>{value}</p>
    </div>
  );
}

function PaginationBar({ page, totalElements, pageSize, onPrev, onNext, hasMore }: {
  page: number; totalElements: number; pageSize: number; onPrev: () => void; onNext: () => void; hasMore: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
      <span style={{ color: '#757575', fontSize: 14 }}>Total: {totalElements} records</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={onPrev} disabled={page === 1} style={pageBtnStyle(page === 1)}>Previous</button>
        <span style={{ padding: '6px 12px', fontSize: 14 }}>Page {page}</span>
        <button onClick={onNext} disabled={!hasMore} style={pageBtnStyle(!hasMore)}>Next</button>
      </div>
    </div>
  );
}

function pageBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', border: '1px solid #DDD', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#F5F5F5' : '#fff', color: disabled ? '#BDBDBD' : '#1E88E5', fontSize: 13, fontWeight: 600,
  };
}

function CreateBatchModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [driverId, setDriverId] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const submit = async () => {
    setLocalError('');
    if (!driverId.trim()) { setLocalError('Driver ID is required'); return; }
    setBusy(true);
    try {
      await api.post('/finance/settlements', {
        driverId: Number(driverId),
        idempotencyKey: idempotencyKey.trim() || `admin-${Date.now()}`,
        paymentReference: paymentReference.trim() || undefined,
      });
      onDone();
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to create settlement batch');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={modalOverlay}>
      <div style={{ ...modalContent, maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>New Settlement Batch</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="text" placeholder="Driver ID *" value={driverId} onChange={(e) => setDriverId(e.target.value)} style={inputStyle} />
          <input type="text" placeholder="Idempotency Key (auto if blank)" value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} style={inputStyle} />
          <input type="text" placeholder="Payment Reference (optional)" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} style={inputStyle} />
          {localError && <p style={{ color: '#C62828', fontSize: 13 }}>{localError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={smallBtn('#ECEFF1', '#37474F')}>Cancel</button>
            <button onClick={submit} disabled={busy} style={{ padding: '8px 16px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>{busy ? 'Creating…' : 'Create Batch'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdjustModal({ title, fields, siteLabel, submitLabel, onSubmit, onClose, onDone }: {
  title: string;
  fields: { key: string; label: string; placeholder?: string }[];
  siteLabel: string;
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const submit = async () => {
    setLocalError('');
    setBusy(true);
    try {
      await onSubmit({ amount, reason, ...extra });
      onDone();
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || err?.error || err?.message || 'Adjustment failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={modalOverlay}>
      <div style={{ ...modalContent, maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>{title}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="text" placeholder={`Amount (₹) — +/- for ${siteLabel}`} value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} />
          <input type="text" placeholder="Reason (audit trail)" value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} />
          {fields.map((f) => (
            <input key={f.key} type="text" placeholder={f.label} value={extra[f.key] || ''} onChange={(e) => setExtra((x) => ({ ...x, [f.key]: e.target.value }))} style={inputStyle} />
          ))}
          {localError && <p style={{ color: '#C62828', fontSize: 13 }}>{localError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={smallBtn('#ECEFF1', '#37474F')}>Cancel</button>
            <button onClick={submit} disabled={busy} style={{ padding: '8px 16px', background: '#1E88E5', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>{busy ? 'Posting…' : submitLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResolveDisputeModal({ rideId, onClose, onDone }: { rideId: number; onClose: () => void; onDone: () => void }) {
  const [refundCustomer, setRefundCustomer] = useState(true);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const submit = async () => {
    setLocalError('');
    setBusy(true);
    try {
      await api.post(`/finance/disputes/${rideId}/resolve`, {
        refundCustomer: String(refundCustomer),
        reason: reason.trim() || 'Dispute resolved',
      });
      onDone();
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={modalOverlay}>
      <div style={{ ...modalContent, maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Resolve Dispute — Ride {rideId}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={refundCustomer} onChange={(e) => setRefundCustomer(e.target.checked)} />
            Refund the customer (ride closed, not settlable)
          </label>
          <input type="text" placeholder="Resolution notes (audit trail)" value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} />
          {localError && <p style={{ color: '#C62828', fontSize: 13 }}>{localError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={smallBtn('#ECEFF1', '#37474F')}>Cancel</button>
            <button onClick={submit} disabled={busy} style={{ padding: '8px 16px', background: '#E91E63', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>{busy ? 'Resolving…' : 'Resolve'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}