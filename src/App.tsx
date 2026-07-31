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
import RideHistoryPage from './pages/RideHistoryPage';
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
import CashPaymentsPage from './pages/CashPaymentsPage';
import CashPaymentDetailPage from './pages/CashPaymentDetailPage';
import FraudDetectionPage from './pages/FraudDetectionPage';
import BusinessDashboardPage from './pages/BusinessDashboardPage';
import MonitoringPage from './pages/MonitoringPage';
import DemandPredictionPage from './pages/DemandPredictionPage';
import RevenueAnalyticsPage from './pages/RevenueAnalyticsPage';
import DriverPerformancePage from './pages/DriverPerformancePage';
import PassengerAnalyticsPage from './pages/PassengerAnalyticsPage';
import FraudAlertsPage from './pages/FraudAlertsPage';
import SearchPage from './pages/SearchPage';
import ComplaintsAnalyticsPage from './pages/ComplaintsAnalyticsPage';
import NotificationGeneratorPage from './pages/NotificationGeneratorPage';
import KycVerificationPage from './pages/KycVerificationPage';
import PredictiveSchedulingPage from './pages/PredictiveSchedulingPage';
import GoalTrackingPage from './pages/GoalTrackingPage';
import KpiForecastPage from './pages/KpiForecastPage';
import AlertsCenterPage from './pages/AlertsCenterPage';
import OperationsMapPage from './pages/OperationsMapPage';
import RewardManagementPage from './pages/RewardManagementPage';
import AuditIntelligencePage from './pages/AuditIntelligencePage';
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
          <Route path="cash-payments" element={<RoleProtectedRoute permission="PAYMENTS_VIEW"><CashPaymentsPage /></RoleProtectedRoute>} />
          <Route path="cash-payments/:paymentId" element={<RoleProtectedRoute permission="PAYMENTS_VIEW"><CashPaymentDetailPage /></RoleProtectedRoute>} />
          <Route path="company-payment" element={<RoleProtectedRoute permission="PAYMENTS_MANAGE"><CompanyPaymentPage /></RoleProtectedRoute>} />
          <Route path="rides" element={<RideMonitoringPage />} />
          <Route path="rides/history" element={<RoleProtectedRoute permission="RIDES_VIEW"><RideHistoryPage /></RoleProtectedRoute>} />
          <Route path="rides/:id" element={<RideDetailPage />} />
          <Route path="cancellations" element={<CancellationManagementPage />} />
          <Route path="earnings" element={<EarningsCommissionPage />} />
          <Route path="sos" element={<SOSManagementPage />} />
          <Route path="config" element={<RoleProtectedRoute permission="CONFIG_VIEW"><SystemConfigPage /></RoleProtectedRoute>} />
          <Route path="fraud" element={<RoleProtectedRoute permission="CONFIG_VIEW"><FraudDetectionPage /></RoleProtectedRoute>} />
          <Route path="pricing" element={<RoleProtectedRoute permission="CONFIG_VIEW"><PricingPage /></RoleProtectedRoute>} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="business" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><BusinessDashboardPage /></RoleProtectedRoute>} />
          <Route path="monitoring" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><MonitoringPage /></RoleProtectedRoute>} />
          <Route path="ai/demand" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><DemandPredictionPage /></RoleProtectedRoute>} />
          <Route path="ai/revenue" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><RevenueAnalyticsPage /></RoleProtectedRoute>} />
          <Route path="ai/drivers" element={<RoleProtectedRoute permission="DRIVERS_VIEW"><DriverPerformancePage /></RoleProtectedRoute>} />
          <Route path="ai/passengers" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><PassengerAnalyticsPage /></RoleProtectedRoute>} />
          <Route path="ai/fraud" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><FraudAlertsPage /></RoleProtectedRoute>} />
          <Route path="search" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><SearchPage /></RoleProtectedRoute>} />
          <Route path="ai/complaints" element={<RoleProtectedRoute permission="SUPPORT_VIEW"><ComplaintsAnalyticsPage /></RoleProtectedRoute>} />
          <Route path="ai/notifications" element={<RoleProtectedRoute permission="NOTIFICATIONS_VIEW"><NotificationGeneratorPage /></RoleProtectedRoute>} />
          <Route path="ai/kyc" element={<RoleProtectedRoute permission="DRIVERS_APPROVE"><KycVerificationPage /></RoleProtectedRoute>} />
          <Route path="ai/scheduling" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><PredictiveSchedulingPage /></RoleProtectedRoute>} />
          <Route path="ai/goals" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><GoalTrackingPage /></RoleProtectedRoute>} />
          <Route path="ai/forecast" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><KpiForecastPage /></RoleProtectedRoute>} />
          <Route path="ai/alerts" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><AlertsCenterPage /></RoleProtectedRoute>} />
          <Route path="ai/map" element={<RoleProtectedRoute permission="DASHBOARD_VIEW"><OperationsMapPage /></RoleProtectedRoute>} />
          <Route path="ai/rewards" element={<RoleProtectedRoute permission="DRIVERS_VIEW"><RewardManagementPage /></RoleProtectedRoute>} />
          <Route path="ai/audit-log" element={<RoleProtectedRoute permission="AUDIT_VIEW"><AuditIntelligencePage /></RoleProtectedRoute>} />
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
