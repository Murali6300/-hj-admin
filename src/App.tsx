import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import DriversPage from './pages/DriversPage';
import PendingDriversPage from './pages/PendingDriversPage';
import PaymentsPage from './pages/PaymentsPage';
import RideMonitoringPage from './pages/RideMonitoringPage';
import CancellationManagementPage from './pages/CancellationManagementPage';
import EarningsCommissionPage from './pages/EarningsCommissionPage';
import SOSManagementPage from './pages/SOSManagementPage';
import SystemConfigPage from './pages/SystemConfigPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import SupportTicketsPage from './pages/SupportTicketsPage';
import WalletPage from './pages/WalletPage';
import CouponsPage from './pages/CouponsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import RolesPermissionsPage from './pages/RolesPermissionsPage';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="drivers/pending" element={<PendingDriversPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="rides" element={<RideMonitoringPage />} />
          <Route path="cancellations" element={<CancellationManagementPage />} />
          <Route path="earnings" element={<EarningsCommissionPage />} />
          <Route path="sos" element={<SOSManagementPage />} />
          <Route path="config" element={<SystemConfigPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="support" element={<SupportTicketsPage />} />
          <Route path="wallets" element={<WalletPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="roles" element={<RolesPermissionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
