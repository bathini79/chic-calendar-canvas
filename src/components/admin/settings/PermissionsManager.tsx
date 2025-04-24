import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PermissionsManagerProps {
  employmentTypes: any[];
  onRefresh: () => void;
}

// Define all available permissions
const AVAILABLE_PERMISSIONS = [
  {
    id: "book_appointments",
    name: "Book Appointments",
    description: "Create and manage appointments"
  },
  {
    id: "view_own_schedule",
    name: "View Own Schedule",
    description: "View personal schedule only"
  },
  {
    id: "view_all_schedules",
    name: "View All Schedules",
    description: "View schedules of all staff members"
  },
  {
    id: "manage_inventory",
    name: "Manage Inventory",
    description: "Add, update, and remove inventory items"
  },
  {
    id: "view_reports",
    name: "View Reports",
    description: "Access financial and business reports"
  },
  {
    id: "manage_staff",
    name: "Manage Staff",
    description: "Add, update, and remove staff members"
  },
  {
    id: "manage_services",
    name: "Manage Services",
    description: "Add, update, and remove services"
  },
  {
    id: "manage_customers",
    name: "Manage Customers",
    description: "Add, update, and remove customer information"
  },
  {
    id: "process_payments",
    name: "Process Payments",
    description: "Handle customer payments"
  },
  {
    id: "apply_discounts",
    name: "Apply Discounts",
    description: "Apply discounts to services and products"
  }
];

export function PermissionsManager({ employmentTypes, onRefresh }: PermissionsManagerProps) {
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize permissions from employmentTypes
    const permissionsMap: Record<string, string[]> = {};
    
    employmentTypes.forEach(type => {
      permissionsMap[type.id] = type.permissions || [];
    });
    
    setPermissions(permissionsMap);
    setIsLoading(false);
  }, [employmentTypes]);

  const handlePermissionChange = (typeId: string, permissionId: string, checked: boolean) => {
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
      
      // Save all permissions in parallel
      const updatePromises = Object.entries(permissions).map(([typeId, perms]) => {
        return supabase
          .from("employment_types")
          .update({ permissions: perms })
          .eq("id", typeId);
      });
      
      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to save some permissions: ${errors[0].error?.message}`);
      }
      
      toast.success("Permissions saved successfully");
      onRefresh();
    } catch (error: any) {
      toast.error("Error saving permissions: " + error.message);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const isPermissionSelected = (typeId: string, permissionId: string) => {
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