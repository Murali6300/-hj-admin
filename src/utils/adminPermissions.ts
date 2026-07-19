/**
 * Admin RBAC permission system.
 * Maps roles to their allowed actions across the admin portal.
 */

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'FINANCE' | 'OPERATIONS';

export type Permission =
  | 'DASHBOARD_VIEW'
  | 'USERS_VIEW' | 'USERS_CREATE' | 'USERS_UPDATE' | 'USERS_DELETE'
  | 'DRIVERS_VIEW' | 'DRIVERS_CREATE' | 'DRIVERS_UPDATE' | 'DRIVERS_DELETE' | 'DRIVERS_APPROVE'
  | 'RIDES_VIEW' | 'RIDES_UPDATE' | 'RIDES_CANCEL'
  | 'VEHICLES_VIEW' | 'VEHICLES_CREATE' | 'VEHICLES_UPDATE' | 'VEHICLES_DELETE'
  | 'PAYMENTS_VIEW' | 'PAYMENTS_PROCESS' | 'PAYMENTS_REFUND' | 'PAYMENTS_MANAGE'
  | 'WALLETS_VIEW' | 'WALLETS_ADJUST'
  | 'COUPONS_VIEW' | 'COUPONS_CREATE' | 'COUPONS_UPDATE' | 'COUPONS_DELETE'
  | 'REPORTS_VIEW' | 'ANALYTICS_VIEW'
  | 'CONFIG_VIEW' | 'CONFIG_UPDATE'
  | 'ADMIN_USERS_VIEW' | 'ADMIN_USERS_CREATE' | 'ADMIN_USERS_UPDATE' | 'ADMIN_USERS_DELETE'
  | 'AUDIT_VIEW'
  | 'SUPPORT_VIEW' | 'SUPPORT_MANAGE'
  | 'SOS_VIEW' | 'SOS_MANAGE'
  | 'NOTIFICATIONS_VIEW' | 'NOTIFICATIONS_SEND';

const ALL_PERMISSIONS: Permission[] = [
  'DASHBOARD_VIEW',
  'USERS_VIEW', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE',
  'DRIVERS_VIEW', 'DRIVERS_CREATE', 'DRIVERS_UPDATE', 'DRIVERS_DELETE', 'DRIVERS_APPROVE',
  'RIDES_VIEW', 'RIDES_UPDATE', 'RIDES_CANCEL',
  'VEHICLES_VIEW', 'VEHICLES_CREATE', 'VEHICLES_UPDATE', 'VEHICLES_DELETE',
  'PAYMENTS_VIEW', 'PAYMENTS_PROCESS', 'PAYMENTS_REFUND', 'PAYMENTS_MANAGE',
  'WALLETS_VIEW', 'WALLETS_ADJUST',
  'COUPONS_VIEW', 'COUPONS_CREATE', 'COUPONS_UPDATE', 'COUPONS_DELETE',
  'REPORTS_VIEW', 'ANALYTICS_VIEW',
  'CONFIG_VIEW', 'CONFIG_UPDATE',
  'ADMIN_USERS_VIEW', 'ADMIN_USERS_CREATE', 'ADMIN_USERS_UPDATE', 'ADMIN_USERS_DELETE',
  'AUDIT_VIEW',
  'SUPPORT_VIEW', 'SUPPORT_MANAGE',
  'SOS_VIEW', 'SOS_MANAGE',
  'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_SEND',
];

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS,
  SUPPORT: [
    'DASHBOARD_VIEW',
    'USERS_VIEW', 'DRIVERS_VIEW', 'RIDES_VIEW', 'VEHICLES_VIEW',
    'SUPPORT_VIEW', 'SUPPORT_MANAGE',
    'SOS_VIEW',
    'NOTIFICATIONS_VIEW',
    'REPORTS_VIEW', 'ANALYTICS_VIEW',
    'PAYMENTS_VIEW',
  ],
  FINANCE: [
    'DASHBOARD_VIEW',
    'USERS_VIEW', 'DRIVERS_VIEW', 'RIDES_VIEW',
    'PAYMENTS_VIEW', 'PAYMENTS_PROCESS', 'PAYMENTS_REFUND', 'PAYMENTS_MANAGE',
    'WALLETS_VIEW', 'WALLETS_ADJUST',
    'COUPONS_VIEW', 'COUPONS_CREATE', 'COUPONS_UPDATE', 'COUPONS_DELETE',
    'REPORTS_VIEW', 'ANALYTICS_VIEW',
  ],
  OPERATIONS: [
    'DASHBOARD_VIEW',
    'USERS_VIEW',
    'DRIVERS_VIEW', 'DRIVERS_UPDATE', 'DRIVERS_APPROVE',
    'RIDES_VIEW', 'RIDES_UPDATE', 'RIDES_CANCEL',
    'VEHICLES_VIEW', 'VEHICLES_CREATE', 'VEHICLES_UPDATE', 'VEHICLES_DELETE',
    'SOS_VIEW', 'SOS_MANAGE',
    'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_SEND',
    'SUPPORT_VIEW', 'SUPPORT_MANAGE',
    'REPORTS_VIEW',
  ],
};

export function getAdminRole(): AdminRole {
  const role = localStorage.getItem('admin_role');
  if (role && role in ROLE_PERMISSIONS) {
    return role as AdminRole;
  }
  return 'ADMIN';
}

export function setAdminRole(role: string): void {
  localStorage.setItem('admin_role', role);
}

export function getPermissions(role?: AdminRole): Permission[] {
  const r = role || getAdminRole();
  return ROLE_PERMISSIONS[r] || [];
}

export function hasPermission(permission: Permission, role?: AdminRole): boolean {
  return getPermissions(role).includes(permission);
}

export function hasAnyPermission(permissions: Permission[], role?: AdminRole): boolean {
  const perms = getPermissions(role);
  return permissions.some(p => perms.includes(p));
}

export function isFullAccess(role?: AdminRole): boolean {
  const r = role || getAdminRole();
  return r === 'SUPER_ADMIN' || r === 'ADMIN';
}
