import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { hasPermission, getAdminRole, type Permission } from '../utils/adminPermissions';

interface NavItem {
  path?: string;
  label: string;
  icon?: string;
  divider?: boolean;
  permission?: Permission;
  anyPermission?: Permission[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊', permission: 'DASHBOARD_VIEW' },
  { divider: true, label: 'Operations' },
  { path: '/rides', label: 'Live Rides', icon: '🗺️', permission: 'RIDES_VIEW' },
  { path: '/cancellations', label: 'Cancellations', icon: '❌', permission: 'RIDES_CANCEL' },
  { path: '/sos', label: 'SOS Alerts', icon: '🚨', permission: 'SOS_VIEW' },
  { divider: true, label: 'Management' },
  { path: '/users', label: 'Users', icon: '👥', permission: 'USERS_VIEW' },
  { path: '/drivers', label: 'Drivers', icon: '🚗', permission: 'DRIVERS_VIEW' },
  { path: '/vehicles', label: 'Vehicles', icon: '🚕', permission: 'VEHICLES_VIEW' },
  { path: '/drivers/pending', label: 'Pending Approvals', icon: '⏳', permission: 'DRIVERS_APPROVE' },
  { divider: true, label: 'Finance' },
  { path: '/payments', label: 'Payments', icon: '💳', permission: 'PAYMENTS_VIEW' },
  { path: '/earnings', label: 'Earnings & Commission', icon: '💰', permission: 'REPORTS_VIEW' },
  { path: '/wallets', label: 'Wallet Management', icon: '👛', permission: 'WALLETS_VIEW' },
  { path: '/coupons', label: 'Coupons', icon: '🎟️', permission: 'COUPONS_VIEW' },
  { divider: true, label: 'Insights' },
  { path: '/analytics', label: 'Analytics', icon: '📉', permission: 'ANALYTICS_VIEW' },
  { path: '/reports', label: 'Reports', icon: '📈', permission: 'REPORTS_VIEW' },
  { divider: true, label: 'System' },
  { path: '/pricing', label: 'Pricing & Surge', icon: '💲', permission: 'CONFIG_VIEW' },
  { path: '/config', label: 'Settings', icon: '⚙️', permission: 'CONFIG_VIEW' },
  { path: '/roles', label: 'Roles & Permissions', icon: '🔐', permission: 'ADMIN_USERS_VIEW' },
  { path: '/audit-logs', label: 'Audit Logs', icon: '📋', permission: 'AUDIT_VIEW' },
  { path: '/notifications', label: 'Notifications', icon: '🔔', permission: 'NOTIFICATIONS_VIEW' },
  { path: '/support', label: 'Support Tickets', icon: '🎫', permission: 'SUPPORT_VIEW' },
];

export default function Layout() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('ADMIN');

  useEffect(() => {
    const name = localStorage.getItem('admin_name');
    if (name) setAdminName(name);
    setAdminRole(getAdminRole());
  }, []);

  const hasItemAccess = (item: NavItem): boolean => {
    if (item.permission) return hasPermission(item.permission);
    if (item.anyPermission) return item.anyPermission.some(p => hasPermission(p));
    return true;
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.divider) return true;
    return hasItemAccess(item);
  });

  const handleLogout = () => {
    if (!confirm('Log out of the admin portal?')) return;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_remember');
    navigate('/login');
  };

  const ROLE_BADGE_COLORS: Record<string, string> = {
    SUPER_ADMIN: '#F44336',
    ADMIN: '#1A73E8',
    SUPPORT: '#4CAF50',
    FINANCE: '#FF6D00',
    OPERATIONS: '#9C27B0',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 260, background: '#1A237E', color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>HJ Admin</h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>{adminName}</p>
          <span style={{
            display: 'inline-block',
            marginTop: 6,
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            color: '#fff',
            background: ROLE_BADGE_COLORS[adminRole] || '#9E9E9E',
          }}>
            {adminRole.replace(/_/g, ' ')}
          </span>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {filteredNavItems.map((item, i) => {
            if ('divider' in item && item.divider) {
              return (
                <div key={`div-${i}`} style={{ padding: '12px 20px 4px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {item.label}
                </div>
              );
            }
            if ('path' in item && item.path) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', color: '#fff', fontSize: 13,
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid #64B5F6' : '3px solid transparent',
                    textDecoration: 'none',
                  })}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              );
            }
            return null;
          })}
        </nav>

        <button
          onClick={handleLogout}
          style={{ margin: '12px 16px', padding: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
        >
          Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: 24, overflow: 'auto', background: '#F5F5F5' }}>
        <Outlet />
      </main>
    </div>
  );
}
