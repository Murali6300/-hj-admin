import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { divider: true, label: 'Operations' },
  { path: '/rides', label: 'Live Rides', icon: '🗺️' },
  { path: '/cancellations', label: 'Cancellations', icon: '❌' },
  { path: '/sos', label: 'SOS Alerts', icon: '🚨' },
  { divider: true, label: 'Management' },
  { path: '/users', label: 'Users', icon: '👥' },
  { path: '/drivers', label: 'Drivers', icon: '🚗' },
  { path: '/drivers/pending', label: 'Pending Approvals', icon: '⏳' },
  { divider: true, label: 'Finance' },
  { path: '/payments', label: 'Payments', icon: '💳' },
  { path: '/earnings', label: 'Earnings & Commission', icon: '💰' },
  { path: '/wallets', label: 'Wallet Management', icon: '👛' },
  { path: '/coupons', label: 'Coupons', icon: '🎟️' },
  { divider: true, label: 'System' },
  { path: '/config', label: 'System Config', icon: '⚙️' },
  { path: '/roles', label: 'Roles & Permissions', icon: '🔐' },
  { path: '/audit-logs', label: 'Audit Logs', icon: '📋' },
  { path: '/reports', label: 'Reports', icon: '📈' },
  { path: '/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/support', label: 'Support Tickets', icon: '🎫' },
];

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 260, background: '#1A237E', color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>HJ Admin</h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>Ride Booking Platform</p>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {navItems.map((item, i) => {
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
