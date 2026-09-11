/**
 * Layout — HJ Admin Portal Premium Enterprise Shell
 *
 * Collapsible sidebar with grouped navigation + top header with search,
 * notifications, and profile. Content area renders child routes.
 */

import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { hasPermission, getAdminRole, type Permission } from '../utils/adminPermissions';
import api from '../api';
import AiAssistant from './AiAssistant/AiAssistant';
import hjLogo from '../assets/hj-logo.jpg';
import '../styles/design-system.css';
import '../styles/Layout.css';

/* ── Nav Item Types ───────────────────────────────────────────── */

interface NavItem {
  path?: string;
  label: string;
  icon: string;
  permission?: Permission;
  anyPermission?: Permission[];
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/* ── Navigation Structure ─────────────────────────────────────── */

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { path: '/', label: 'Dashboard', icon: '📊', permission: 'DASHBOARD_VIEW' },
    ],
  },
  {
    label: 'User Management',
    items: [
      { path: '/users', label: 'Users', icon: '👥', permission: 'USERS_VIEW' },
      { path: '/wallets', label: 'User Wallet', icon: '👛', permission: 'WALLETS_VIEW' },
      { path: '/rides/history', label: 'Ride History', icon: '📜', permission: 'RIDES_VIEW' },
    ],
  },
  {
    label: 'Driver Management',
    items: [
      { path: '/drivers', label: 'Drivers', icon: '🚗', permission: 'DRIVERS_VIEW' },
      { path: '/drivers/pending', label: 'Driver Approval', icon: '⏳', permission: 'DRIVERS_APPROVE' },
      { path: '/vehicles', label: 'Vehicles', icon: '🚕', permission: 'VEHICLES_VIEW' },
    ],
  },
  {
    label: 'Ride Management',
    items: [
      { path: '/rides', label: 'Live Rides', icon: '🗺️', permission: 'RIDES_VIEW' },
      { path: '/cancellations', label: 'Cancellations', icon: '❌', permission: 'RIDES_CANCEL' },
      { path: '/sos', label: 'SOS Alerts', icon: '🚨', permission: 'SOS_VIEW' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/payments', label: 'Payments', icon: '💳', permission: 'PAYMENTS_VIEW' },
      { path: '/cash-payments', label: 'Cash Payments', icon: '💵', permission: 'PAYMENTS_VIEW' },
      { path: '/company-payment', label: 'Company Payments', icon: '🏦', permission: 'PAYMENTS_MANAGE' },
      { path: '/earnings', label: 'Earnings & Commission', icon: '💰', permission: 'REPORTS_VIEW' },
      { path: '/coupons', label: 'Coupons & Offers', icon: '🎟️', permission: 'COUPONS_VIEW' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { path: '/business', label: 'Business Dashboard', icon: '💡', permission: 'DASHBOARD_VIEW' },
      { path: '/monitoring', label: 'AI Operations Center', icon: '🧠', permission: 'DASHBOARD_VIEW' },
      { path: '/analytics', label: 'Analytics', icon: '📉', permission: 'ANALYTICS_VIEW' },
      { path: '/reports', label: 'Reports', icon: '📈', permission: 'REPORTS_VIEW' },
    ],
  },
  {
    label: 'AI Intelligence',
    items: [
      { path: '/ai/demand', label: 'Demand Prediction', icon: '📍', permission: 'DASHBOARD_VIEW' },
      { path: '/ai/revenue', label: 'Revenue Analytics', icon: '💰', permission: 'DASHBOARD_VIEW' },
      { path: '/ai/drivers', label: 'Driver Performance', icon: '🚖', permission: 'DRIVERS_VIEW' },
      { path: '/ai/passengers', label: 'Passenger Analytics', icon: '👤', permission: 'DASHBOARD_VIEW' },
      { path: '/ai/fraud', label: 'Fraud Alerts', icon: '🚩', permission: 'DASHBOARD_VIEW' },
      { path: '/ai/complaints', label: 'Complaint Analysis', icon: '🎫', permission: 'SUPPORT_VIEW' },
      { path: '/ai/notifications', label: 'Notification Studio', icon: '📣', permission: 'NOTIFICATIONS_VIEW' },
      { path: '/ai/kyc', label: 'KYC Verification', icon: '🪪', permission: 'DRIVERS_APPROVE' },
      { path: '/ai/scheduling', label: 'Predictive Scheduling', icon: '🗓️', permission: 'DASHBOARD_VIEW' },
      { path: '/ai/goals', label: 'Goal Tracking', icon: '🎯', permission: 'DASHBOARD_VIEW' },
      { path: '/ai/forecast', label: 'AI Forecasting', icon: '🔮', permission: 'DASHBOARD_VIEW' },
      { path: '/ai/alerts', label: 'Alerts Center', icon: '🚨', permission: 'DASHBOARD_VIEW' },
      { path: '/ai/map', label: 'Live Operations Map', icon: '🗺️', permission: 'DASHBOARD_VIEW' },
      { path: '/ai/rewards', label: 'Reward Management', icon: '🏆', permission: 'DRIVERS_VIEW' },
      { path: '/ai/audit-log', label: 'AI Audit Logs', icon: '🕵️', permission: 'AUDIT_VIEW' },
      { path: '/search', label: 'AI Search', icon: '🔍', permission: 'DASHBOARD_VIEW' },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/fraud', label: 'Fraud Detection', icon: '🛡️', permission: 'CONFIG_VIEW' },
      { path: '/pricing', label: 'Pricing & Surge', icon: '💲', permission: 'CONFIG_VIEW' },
      { path: '/config', label: 'Settings', icon: '⚙️', permission: 'CONFIG_VIEW' },
      { path: '/roles', label: 'Roles & Permissions', icon: '🔐', permission: 'ADMIN_USERS_VIEW' },
      { path: '/audit-logs', label: 'Audit Logs', icon: '📋', permission: 'AUDIT_VIEW' },
      { path: '/notifications', label: 'Notifications', icon: '🔔', permission: 'NOTIFICATIONS_VIEW' },
      { path: '/support', label: 'Support Tickets', icon: '🎫', permission: 'SUPPORT_VIEW' },
    ],
  },
];

/* ── SVG Icons ────────────────────────────────────────────────── */

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/* ── Component ────────────────────────────────────────────────── */

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('ADMIN');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(new Date());
  const [fraudCount, setFraudCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const fraudFetchingRef = useRef(false);

  useEffect(() => {
    const name = localStorage.getItem('admin_name');
    if (name) setAdminName(name);
    setAdminRole(getAdminRole());
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchFraudCount = async () => {
      if (fraudFetchingRef.current) return;
      fraudFetchingRef.current = true;
      try {
        const res = await api.get<{ unresolvedFlags: number }>('/fraud/stats');
        setFraudCount(res.data.unresolvedFlags || 0);
      } catch {
        // silent
      } finally {
        fraudFetchingRef.current = false;
      }
    };
    fetchFraudCount();
    const interval = setInterval(fetchFraudCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const hasItemAccess = useCallback((item: NavItem): boolean => {
    if (item.permission) return hasPermission(item.permission);
    if (item.anyPermission) return item.anyPermission.some((p) => hasPermission(p));
    return true;
  }, []);

  const filteredGroups = useMemo(() => {
    const groups = navGroups
      .map((g) => ({
        ...g,
        items: g.items.map((item) => {
          if (item.path === '/fraud' && fraudCount > 0) {
            return { ...item, badge: fraudCount };
          }
          return item;
        }),
      }))
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => hasItemAccess(item)),
      }))
      .filter((g) => g.items.length > 0 || g.label === '');
    return groups;
  }, [fraudCount, hasItemAccess]);

const isPathActive = (itemPath: string, pathname: string): boolean => {
  if (itemPath === '/') return pathname === '/';
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
};

const activeGroupLabel = useMemo(() => {
  const pathname = location.pathname;
  const group = filteredGroups.find((g) =>
    g.items.some((item) => item.path && isPathActive(item.path, pathname)),
  );
  return group?.label || '';
}, [location.pathname, filteredGroups]);

const toggleGroup = (label: string) => {
  setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
};

useEffect(() => {
  const active = filteredGroups.find((g) =>
    g.items.some((item) => item.path && isPathActive(item.path, location.pathname)),
  );
  if (active?.label) {
    setOpenGroups((prev) => (prev[active.label] ? prev : { ...prev, [active.label]: true }));
  }
}, [location.pathname, filteredGroups]);

  const handleLogout = () => {
    if (!confirm('Log out of the admin portal?')) return;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_remember');
    navigate('/login');
  };

  const initials = adminName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="hj-layout">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside
        className={`hj-sidebar${collapsed ? ' hj-sidebar--collapsed' : ''}${mobileOpen ? ' hj-sidebar--mobile-open' : ''}`}
      >
        {/* Collapse toggle */}
        <button
          className="hj-sidebar__collapse"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft />
        </button>

        {/* Logo + Brand */}
        <div className="hj-sidebar__header">
          <div className="hj-sidebar__logo">
            <img src={hjLogo} alt="HJ" className="hj-sidebar__logo-img" draggable={false} />
          </div>
          <div className="hj-sidebar__brand">
            <div className="hj-sidebar__brand-name">
              <span style={{ color: '#FFFFFF' }}>HAPPY </span>
              <span style={{ color: '#FFFFFF' }}>JOURNEY</span>
            </div>
            <div className="hj-sidebar__brand-role">{adminRole.replace(/_/g, ' ')}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hj-sidebar__nav">
          {filteredGroups.map((group, gi) => {
            const open = group.label ? !!openGroups[group.label] : true;
            return (
            <div className="hj-nav-group" key={`g-${gi}`}>
              {group.label && (
                <button
                  type="button"
                  className={`hj-nav-group__toggle${open ? ' hj-nav-group__toggle--open' : ''}${group.label === activeGroupLabel ? ' hj-nav-group__toggle--active' : ''}`}
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={open}
                >
                  <span className="hj-nav-group__toggle-label">{group.label}</span>
                  <span className="hj-nav-group__toggle-chevron">
                    <ChevronDown />
                  </span>
                </button>
              )}
              {open && (
                <div className="hj-nav-group__items hj-nav-group__items--animate">
                  {group.items.map((item) =>
                    item.path ? (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                          `hj-nav-item${isActive ? ' hj-nav-item--active' : ''}`
                        }
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="hj-nav-item__icon">{item.icon}</span>
                        <span className="hj-nav-item__label">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="hj-nav-item__badge hj-nav-item__badge--alert">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ) : null,
                  )}
                </div>
              )}
            </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="hj-sidebar__footer">
          <button className="hj-sidebar__logout" onClick={handleLogout}>
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────── */}
      <div className={`hj-main${collapsed ? ' hj-main--sidebar-collapsed' : ''}`}>
        {/* Top Header */}
        <header className="hj-header">
          {/* Mobile menu button */}
          <button
            className="hj-header__btn"
            style={{ display: 'none' }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Search */}
          <div className="hj-header__search">
            <span className="hj-header__search-icon">
              <SearchIcon />
            </span>
            <input
              className="hj-header__search-input"
              type="text"
              placeholder="Search users, drivers, rides..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchInput.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
                  setSearchInput('');
                }
              }}
            />
          </div>

          {/* Actions */}
          <div className="hj-header__actions">
            <button className="hj-header__btn" title="Notifications">
              <BellIcon />
              <span className="hj-header__btn-badge" />
            </button>

            {/* Quick Action */}
            <button className="hj-header__quick-action">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Driver</span>
            </button>
          </div>

          {/* Profile */}
          <div className="hj-header__profile">
            <div className="hj-header__avatar">{initials}</div>
            <div className="hj-header__profile-info">
              <div className="hj-header__profile-name">{adminName}</div>
              <div className="hj-header__profile-role">{adminRole.replace(/_/g, ' ')}</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="hj-content">
          <Outlet context={{ greeting, now }} />
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 150,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* AI Operations Intelligence Assistant (every admin screen) */}
      {hasPermission('DASHBOARD_VIEW') && <AiAssistant />}
    </div>
  );
}
