import React from 'react';
import { SectionPermission, usePermissions } from '@/hooks/usePermissions';

interface SectionGuardProps {
  section: SectionPermission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A component that conditionally renders its children based on whether
 * the current user has access to the specified section.
 * 
 * @example
 * // Show staff section only if user has access
 * <SectionGuard section="staff">
 *   <StaffManagement />
 * </SectionGuard>
 * 
 * @example
 * // Show alternative content if user doesn't have access
 * <SectionGuard 
 *   section="settings"
 *   fallback={<AccessDeniedMessage />}
 * >
 *   <SettingsPanel />
 * </SectionGuard>
 */
export function SectionGuard({
  section,
  fallback = null,
  children,
}: SectionGuardProps) {
  const { hasAccess, loading } = usePermissions();

  // Show nothing or fallback while permissions are loading
  if (loading) {
    return fallback ? <>{fallback}</> : null;
  }

  // Render children if has access, otherwise render fallback
  return hasAccess(section) ? <>{children}</> : fallback ? <>{fallback}</> : null;
}