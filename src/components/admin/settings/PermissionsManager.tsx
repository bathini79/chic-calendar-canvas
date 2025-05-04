import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SectionPermission } from "@/hooks/usePermissions";

interface PermissionsManagerProps {
  employmentTypes: any[];
  onRefresh: () => void;
}

// Define all available permissions - updated to match section permissions in usePermissions hook
const AVAILABLE_PERMISSIONS = [
  
  {
    id: "perform_services" as SectionPermission,
    name: "Perform Services",
    description: "Perform haircuts, treatments, and other salon services on customers"
  },
  {
    id: "appointments" as SectionPermission,
    name: "Appointments & Bookings",
    description: "Create and manage appointments, view schedules"
  },
  {
    id: "services" as SectionPermission,
    name: "Services",
    description: "Manage salon services and treatments"
  },
  {
    id: "staff" as SectionPermission,
    name: "Staff Management",
    description: "Add, update, and remove staff members"
  },
  {
    id: "inventory" as SectionPermission,
    name: "Inventory",
    description: "Add, update, and remove inventory items"
  },
  {
    id: "reports" as SectionPermission,
    name: "Reports",
    description: "Access financial and business reports"
  },
  {
    id: "sales" as SectionPermission,
    name: "Sales",
    description: "Process sales, payments, and view sales history"
  },
  {
    id: "packages" as SectionPermission,
    name: "Packages",
    description: "Manage service packages and bundles"
  },
  {
    id: "locations" as SectionPermission,
    name: "Locations",
    description: "Manage business locations and settings"
  },
  {
    id: "settings" as SectionPermission,
    name: "Settings",
    description: "Access and modify business settings"
  }
];

export function PermissionsManager({ employmentTypes, onRefresh }: PermissionsManagerProps) {
  const [permissions, setPermissions] = useState<Record<string, SectionPermission[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize permissions from employmentTypes
    const permissionsMap: Record<string, SectionPermission[]> = {};
      
    employmentTypes.forEach(type => {
      // Ensure permissions is always an array, even if it comes as null or undefined
      let typePermissions: SectionPermission[] = [];
      
      // Handle different formats that might come from Supabase
      if (type.permissions) {
        if (typeof type.permissions === 'string') {
          try {
            // Try to parse if it's a string
            typePermissions = JSON.parse(type.permissions) as SectionPermission[];
          } catch (e) {
            console.error(`Failed to parse permissions string for type ${type.id}:`, e);
            typePermissions = [];
          }
        } else if (Array.isArray(type.permissions)) {
          // Already an array
          typePermissions = [...type.permissions] as SectionPermission[];
        } else if (typeof type.permissions === 'object') {
          // Handle potential PostgreSQL JSONB object format
          typePermissions = Object.values(type.permissions) as SectionPermission[];
        }
      }
      
      permissionsMap[type.id] = typePermissions;
    });
    
    setPermissions(permissionsMap);
    setIsLoading(false);
  }, [employmentTypes]);

  const handlePermissionChange = (typeId: string, permissionId: SectionPermission, checked: boolean) => {
    
    setPermissions(prev => {
      const currentPermissions = [...(prev[typeId] || [])];
      
      if (checked) {
        if (!currentPermissions.includes(permissionId)) {
          currentPermissions.push(permissionId);
        }
      } else {
        const index = currentPermissions.indexOf(permissionId);
        if (index !== -1) {
          currentPermissions.splice(index, 1);
        }
      }
            
      return {
        ...prev,
        [typeId]: currentPermissions
      };
    });
  };

  const savePermissions = async () => {
    try {
      setIsSaving(true);
      let successCount = 0;
      
      // Process each permission update sequentially
      for (const [typeId, perms] of Object.entries(permissions)) {
        try {
          // Use a simple array approach with explicit conversion          
          // Try direct approach with permissions as an array
          const { error } = await supabase
            .from("employment_types")
            .update({ 
              permissions: perms,
              updated_at: new Date().toISOString() // Force update with current timestamp
            })
            .eq("id", typeId);
          
          if (error) {
            console.error(`Error with direct array approach for type ${typeId}:`, error);
            
            // If direct approach fails, try with RPC function
            const { error: rpcError } = await supabase.rpc('update_employment_type_permissions', {
              type_id: typeId,
              perms_json: JSON.stringify(perms)
            });
            
            if (rpcError) {
              throw new Error(`Both update methods failed: ${rpcError.message}`);
            } else {
              successCount++;
            }
          } else {
            successCount++;
          }
        } catch (typeError) {
          console.error(`Failed to save permissions for type ${typeId}:`, typeError);
        }
      }
      
      // Report success based on how many types were successfully updated
      if (successCount === Object.keys(permissions).length) {
        toast.success("All permissions saved successfully");
      } else if (successCount > 0) {
        toast.success(`Saved permissions for ${successCount} out of ${Object.keys(permissions).length} employment types`);
      } else {
        toast.error("Failed to save any permissions");
      }
      
      // Force a fresh reload with a small delay
      setTimeout(() => {
        onRefresh();
      }, 500);
    } catch (error: any) {
      toast.error("Error saving permissions: " + error.message);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const isPermissionSelected = (typeId: string, permissionId: SectionPermission) => {
    return permissions[typeId]?.includes(permissionId) || false;
  };

  const isAdminType = (type: any) => {
    return type.name === "Admin" || !type.is_configurable;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Permissions</CardTitle>
        <Button onClick={savePermissions} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-6">
          Configure which permissions each employment type has. Admin roles always have all permissions.
        </p>

        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <p>Loading permissions...</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Permission</TableHead>
                  <TableHead className="w-[250px]">Description</TableHead>
                  {employmentTypes.map(type => (
                    <TableHead key={type.id} className="text-center">
                      {type.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {AVAILABLE_PERMISSIONS.map(permission => (
                  <TableRow key={permission.id}>
                    <TableCell className="font-medium">{permission.name}</TableCell>
                    <TableCell>{permission.description}</TableCell>
                    {employmentTypes.map(type => (
                      <TableCell key={`${type.id}-${permission.id}`} className="text-center">
                        <Checkbox 
                          checked={isAdminType(type) || isPermissionSelected(type.id, permission.id)}
                          onCheckedChange={(checked) => handlePermissionChange(type.id, permission.id, !!checked)}
                          disabled={isAdminType(type)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}