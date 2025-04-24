import { Permission, usePermissions } from './usePermissions';

type ResourceType = 
  | 'employees'
  | 'services'
  | 'packages'
  | 'inventory'
  | 'locations'
  | 'appointments'
  | 'reports';

type CrudOperation = 'create' | 'read' | 'update' | 'delete';

/**
 * Hook for checking CRUD operation permissions for specific resources
 * 
 * @example
 * const { canCreate, canRead, canUpdate, canDelete } = useCrudPermissions('employees');
 * 
 * return (
 *   <div>
 *     {canCreate && <Button onClick={handleAddEmployee}>Add Employee</Button>}
 *     {canRead && <EmployeeList />}
 *     {canUpdate && <Button onClick={handleEditEmployee}>Edit Employee</Button>}
 *     {canDelete && <Button onClick={handleDeleteEmployee}>Delete Employee</Button>}
 *   </div>
 * );
 */
export function useCrudPermissions(resourceType: ResourceType) {
  const { hasAccess, isAdmin } = usePermissions();

  // If admin, automatically grant all permissions
  if (isAdmin) {
    return {
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    };
  }

  // Map resource type to section permission
  const sectionMapping: Record<ResourceType, Permission> = {
    employees: 'staff',
    services: 'services',
    packages: 'services',
    inventory: 'inventory',
    locations: 'locations',
    appointments: 'appointments',
    reports: 'reports'
  };

  // For now, if user has access to the section, grant all CRUD permissions for that section
  const hasSection = hasAccess(sectionMapping[resourceType] as Permission);

  return {
    canCreate: hasSection,
    canRead: hasSection,
    canUpdate: hasSection,
    canDelete: hasSection,
  };
}

/**
 * Hook for checking if a specific CRUD operation is permitted for a resource
 * 
 * @example
 * const canUpdateServices = useOperationPermission('update', 'services');
 * 
 * if (canUpdateServices) {
 *   // Show edit button or perform update operation
 * }
 */
export function useOperationPermission(
  operation: CrudOperation,
  resourceType: ResourceType
): boolean {
  const { isAdmin, hasAccess } = usePermissions();
  
  // Admin has all permissions
  if (isAdmin) return true;

  // Map resource type to section permission
  const sectionMapping: Record<ResourceType, Permission> = {
    employees: 'staff',
    services: 'services',
    packages: 'services',
    inventory: 'inventory',
    locations: 'locations',
    appointments: 'appointments',
    reports: 'reports'
  };
  
  // For now, if user has access to the section, grant all operations for that section
  return hasAccess(sectionMapping[resourceType] as Permission);
}