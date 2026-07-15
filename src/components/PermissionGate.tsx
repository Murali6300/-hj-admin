import React from 'react';
import { hasPermission, hasAnyPermission, type Permission } from '../utils/adminPermissions';

interface PermissionGateProps {
  permission?: Permission;
  anyPermission?: Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  anyPermission,
  fallback = null,
  children,
}) => {
  const allowed = permission
    ? hasPermission(permission)
    : anyPermission
      ? hasAnyPermission(anyPermission)
      : true;

  return <>{allowed ? children : fallback}</>;
};

export default PermissionGate;
