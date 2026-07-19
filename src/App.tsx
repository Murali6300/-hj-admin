import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import DriversPage from './pages/DriversPage';
import PendingDriversPage from './pages/PendingDriversPage';
import VehiclesPage from './pages/VehiclesPage';
import PaymentsPage from './pages/PaymentsPage';
import RideMonitoringPage from './pages/RideMonitoringPage';
import RideDetailPage from './pages/RideDetailPage';
import CancellationManagementPage from './pages/CancellationManagementPage';
import EarningsCommissionPage from './pages/EarningsCommissionPage';
import SOSManagementPage from './pages/SOSManagementPage';
import SystemConfigPage from './pages/SystemConfigPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import SupportTicketsPage from './pages/SupportTicketsPage';
import WalletPage from './pages/WalletPage';
import CouponsPage from './pages/CouponsPage';
import PricingPage from './pages/PricingPage';
import AuditLogsPage from './pages/AuditLogsPage';
import RolesPermissionsPage from './pages/RolesPermissionsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CompanyPaymentPage from './pages/CompanyPaymentPage';
import Layout from './components/Layout';
import { hasPermission, type Permission } from './utils/adminPermissions';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function RoleProtectedRoute({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  if (!hasPermission(permission)) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="drivers/pending" element={<PendingDriversPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="company-payment" element={<RoleProtectedRoute permission="PAYMENTS_MANAGE"><CompanyPaymentPage /></RoleProtectedRoute>} />
          <Route path="rides" element={<RideMonitoringPage />} />
          <Route path="rides/:id" element={<RideDetailPage />} />
          <Route path="cancellations" element={<CancellationManagementPage />} />
          <Route path="earnings" element={<EarningsCommissionPage />} />
          <Route path="sos" element={<SOSManagementPage />} />
          <Route path="config" element={<RoleProtectedRoute permission="CONFIG_VIEW"><SystemConfigPage /></RoleProtectedRoute>} />
          <Route path="pricing" element={<RoleProtectedRoute permission="CONFIG_VIEW"><PricingPage /></RoleProtectedRoute>} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="support" element={<SupportTicketsPage />} />
          <Route path="wallets" element={<WalletPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="audit-logs" element={<RoleProtectedRoute permission="AUDIT_VIEW"><AuditLogsPage /></RoleProtectedRoute>} />
          <Route path="roles" element={<RoleProtectedRoute permission="ADMIN_USERS_VIEW"><RolesPermissionsPage /></RoleProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
