import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataPagination, STANDARD_PAGE_SIZES } from "@/components/common/DataPagination";

interface StaffListProps {
  searchQuery: string;
  onEdit: (employeeId: string) => void;
}

export function StaffList({ searchQuery, onEdit }: StaffListProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string, name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(STANDARD_PAGE_SIZES[0]); // Use first standard size (10)
  const [totalCount, setTotalCount] = useState(0);

  const { data: employees = [], isLoading, refetch } = useQuery({
    queryKey: ["employees-with-locations", searchQuery, currentPage, pageSize],
    queryFn: async () => {
      // First get the total count for pagination
      let countQuery = supabase
        .from("employees")
        .select("id", { count: "exact" });
      
      if (searchQuery) {
        countQuery = countQuery.ilike("name", `%${searchQuery}%`);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.error("Error fetching count:", countError);
        throw countError;
      }
      
      setTotalCount(count || 0);
      
      // Then get the paginated data
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      let query = supabase
        .from("employees")
        .select(`
          *,
          employee_skills(service_id, services:services(name)),
          employee_locations(location_id, locations:locations(name))
        `)
        .order("name")
        .range(from, to);
      
      // Apply server-side filter if search query exists
      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching employees:", error);
        throw error;
      }
      
      return data || [];
    },
  });

  const filteredEmployees = employees;

  const promptDeleteEmployee = (employee: { id: string, name: string }) => {
    setEmployeeToDelete(employee);
    setShowDeleteDialog(true);
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setEmployeeToDelete(null);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      const employeeId = employeeToDelete.id;
      setShowDeleteDialog(false);

      // First, delete related employee_skills records
      const { error: skillsError } = await supabase
        .from('employee_skills')
        .delete()
        .eq('employee_id', employeeId);
      
      if (skillsError) throw skillsError;
      
      // Delete related employee_locations records
      const { error: locationsError } = await supabase
        .from('employee_locations')
        .delete()
        .eq('employee_id', employeeId);
      
      if (locationsError) throw locationsError;
      
      // Delete employee verification records if they exist
      await supabase
        .from('employee_verification_codes')
        .delete()
        .eq('employee_id', employeeId);
        
      await supabase
        .from('employee_verification_links')
        .delete()
        .eq('employee_id', employeeId);

      // Get auth_id from the employee record
      const { data: employeeData, error: getEmployeeError } = await supabase
        .from('employees')
        .select('auth_id')
        .eq('id', employeeId)
        .single();
        
      if (getEmployeeError && getEmployeeError.code !== 'PGRST116') {
        throw getEmployeeError;
      }
      
      // Delete the employee record
      const { error: employeeError } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (employeeError) throw employeeError;

      // Delete the Authentication User and profile if auth_id exists
      try {          
        // Use the edge function to delete the auth user
        const { error: authError } = await supabase.functions.invoke('employee-onboarding', {
          body: { 
            action: 'delete',
            authUserId: employeeData?.auth_id
          }
        });

        if (authError) throw authError;
      } catch (cleanupError) {
        console.error("Error cleaning up related records:", cleanupError);
        toast.error("Staff member deleted, but there was an issue cleaning up related accounts");
      }

      toast.success("Staff member deleted successfully");
      setEmployeeToDelete(null);
      refetch();

    } catch (error: any) {
      toast.error(error.message || "Failed to delete staff member");
      console.error("Error deleting staff member:", error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="bg-white rounded-md shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Locations</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                        {employee.photo_url ? (
                          <AvatarImage src={employee.photo_url} alt={employee.name} />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {employee.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm sm:text-base">{employee.name}</div>
                        <div className="sm:hidden text-xs text-muted-foreground">{employee.phone}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{employee.phone}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="capitalize">{employee.employment_type}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={employee.status === "active" ? "outline" : "destructive"}
                      className="capitalize text-xs whitespace-nowrap"
                    >
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {employee.employee_locations?.map((loc: any) => (
                        <Badge key={loc.location_id} variant="secondary" className="text-xs px-2 py-0">
                          {loc.locations?.name || "Unknown"}
                        </Badge>
                      ))}
                      {!employee.employee_locations?.length && (
                        <span className="text-muted-foreground text-xs">None assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => onEdit(employee.id)}
                      >
                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline ml-1">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-destructive"
                        onClick={() => promptDeleteEmployee({ id: employee.id, name: employee.name })}
                      >
                        <Trash className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline ml-1">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-lg font-medium mb-2">No staff members found</p>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery
                          ? `No results for "${searchQuery}"`
                          : "Add your first staff member to get started"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Replace existing pagination with standardized version */}
        <div className="px-4 py-4 border-t border-gray-200">
          <DataPagination
            currentPage={currentPage}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={STANDARD_PAGE_SIZES}
          />
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete staff member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {employeeToDelete?.name}? This will permanently remove the staff member,
              their account, and all associated data from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
