import React from 'react';
import { Permission, usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  permission: Permission | Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
  requireAll?: boolean;
}

/**
 * A component that conditionally renders its children based on whether
 * the current user has the specified permission(s).
 * 
 * @example
 * // Show a button only if user has permission to create employees
 * <PermissionGuard permission="create:employees">
 *   <Button onClick={handleCreateEmployee}>Add Employee</Button>
 * </PermissionGuard>
 * 
 * @example
 * // Show content if user has any of these permissions
 * <PermissionGuard permission={["update:services", "delete:services"]}>
 *   <ServiceActions />
 * </PermissionGuard>
 * 
 * @example
 * // Show content only if user has ALL these permissions
 * <PermissionGuard 
 *   permission={["create:inventory", "update:inventory"]} 
 *   requireAll={true}
 * >
 *   <InventoryForm />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  fallback = null,
  children,
  requireAll = false,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  // Show nothing or fallback while permissions are loading
  if (loading) {
    return fallback ? <>{fallback}</> : null;
  }

  // Check permissions based on the requireAll flag
  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);

  // Render children if has access, otherwise render fallback
  return hasAccess ? <>{children}</> : fallback ? <>{fallback}</> : null;
}