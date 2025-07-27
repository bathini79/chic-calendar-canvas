import { useState, useRef, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

// UI Components
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card } from "@/components/ui/card";

// Icons
import { Edit, Edit2, Trash, MoreVertical, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@radix-ui/react-separator";

interface StaffMembersProps {
  searchQuery: string;
  onEdit: (employeeId: string) => void;
}

export function StaffMembers({ searchQuery, onEdit }: StaffMembersProps) {
  const isMobile = useIsMobile();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const PAGE_SIZE = 10; // Changed to show only 10 items at a time
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["employees-with-locations", searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("employees")
        .select(
          `
          *,
          employee_skills(service_id, services:services(name)),
          employee_locations(location_id, locations:locations(name))
        `
        )
        .order("name")
        .range(from, to);

      // Apply filter if search query exists
      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching employees:", error);
        throw error;
      }

      return {
        items: data || [],
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    // Create new intersection observer on component mount or when dependencies change
    if (loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            console.log("Loading next page of staff members");
            fetchNextPage();
          }
        },
        { threshold: 0.1, rootMargin: "200px" } // Increased root margin to load earlier
      );

      observerRef.current.observe(loadMoreRef.current);
    }

    // Cleanup observer on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreRef, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const promptDeleteEmployee = (employee: { id: string; name: string }) => {
    setEmployeeToDelete(employee);
    setShowDeleteDialog(true);
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setEmployeeToDelete(null);
  };

  const deleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      const employeeId = employeeToDelete.id;
      setShowDeleteDialog(false);

      // Delete all related records in the correct order
      // Note: Most tables have ON DELETE CASCADE, but we'll explicitly delete for better control and logging

      // 1. Delete skills
      const { error: skillsError } = await supabase
        .from("employee_skills")
        .delete()
        .eq("employee_id", employeeId);

      if (skillsError) throw skillsError;

      // 2. Delete locations
      const { error: locationsError } = await supabase
        .from("employee_locations")
        .delete()
        .eq("employee_id", employeeId);

      if (locationsError) throw locationsError;

      // 3. Delete compensation settings
      const { error: compensationError } = await supabase
        .from("employee_compensation_settings")
        .delete()
        .eq("employee_id", employeeId);

      if (compensationError) throw compensationError;

      // 4. Delete commission settings
      const { error: commissionSettingsError } = await supabase
        .from("employee_commission_settings")
        .delete()
        .eq("employee_id", employeeId);

      if (commissionSettingsError) throw commissionSettingsError;

      // 5. Delete flat commission rules
      const { error: flatCommissionError } = await supabase
        .from("flat_commission_rules")
        .delete()
        .eq("employee_id", employeeId);

      if (flatCommissionError) throw flatCommissionError;

      // 6. Delete tiered commission slabs
      const { error: tieredCommissionError } = await supabase
        .from("tiered_commission_slabs")
        .delete()
        .eq("employee_id", employeeId);

      if (tieredCommissionError) throw tieredCommissionError;

      // 7. Delete availability
      const { error: availabilityError } = await supabase
        .from("employee_availability")
        .delete()
        .eq("employee_id", employeeId);

      if (availabilityError) throw availabilityError;

      // 8. Delete recurring shifts
      const { error: shiftsError } = await supabase
        .from("recurring_shifts")
        .delete()
        .eq("employee_id", employeeId);

      if (shiftsError) throw shiftsError;

      // 9. Delete time off requests
      const { error: timeOffError } = await supabase
        .from("time_off_requests")
        .delete()
        .eq("employee_id", employeeId);

      if (timeOffError) throw timeOffError;

      // 10. Delete verification codes and links
      const { error: verificationCodesError } = await supabase
        .from("employee_verification_codes")
        .delete()
        .eq("employee_id", employeeId);

      if (verificationCodesError) throw verificationCodesError;

      const { error: verificationLinksError } = await supabase
        .from("employee_verification_links")
        .delete()
        .eq("employee_id", employeeId);

      if (verificationLinksError) throw verificationLinksError;

      // Finally, delete the employee record
      const { error: employeeError } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeId);

      if (employeeError) throw employeeError;

      // Delete the auth user
      const { error: authError } = await supabase.functions.invoke('delete-auth-user', {
        body: { userId: employeeId }
      });

      if (authError) {
        console.error("Error deleting auth user:", authError);
        // Don't throw here as the employee data is already deleted
      }

      toast.success(`${employeeToDelete.name} has been removed`);
      refetch();
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast.error(`Failed to delete employee: ${error.message}`);
    } finally {
      setEmployeeToDelete(null);
    }
  };
  // Flatten the pages of data
  const employees = data?.pages.flatMap((page) => page.items) || [];

  if (isLoading && !employees.length) {
    return (
      <div className="flex justify-center items-center h-32">Loading...</div>
    );
  }

  // Mobile view (simplified list)
  if (isMobile) {
    return (
      <div className="space-y-1">
        {employees.map((employee, idx) => (
            <div key={employee.id}>
            <div className="p-3">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                <AvatarImage src={employee.avatar || ""} />
                <AvatarFallback>
                  {employee.name?.charAt(0) || "?"}
                </AvatarFallback>
                </Avatar>
                <div
                className="min-h-[40px] flex flex-col justify-center"
                
                >
                <div className="font-medium">{employee.name}</div>
                {employee.phone && (
                  <div className="text-xs text-muted-foreground">
                  +{employee.phone}
                  </div>
                )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(employee.id)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() =>
                  promptDeleteEmployee({
                    id: employee.id,
                    name: employee.name,
                  })
                  }
                >
                  Delete
                </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
            {/* Divider between employees except after the last one */}
            {idx < employees.length - 1 && (
              <div className="border-b" style={{ color: "hsl(0deg 6.58% 67.86%)" }} />
            )}
            </div>
        ))}
        {/* Infinite scroll loading trigger */}
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">
                Loading more staff...
              </span>
            </div>
          )}
        </div>
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {employeeToDelete?.name} and all
                associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteEmployee}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  } // Desktop view (table layout)
  return (
    <div className="space-y-4">
      {" "}
      {/* Custom order button removed as requested */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {" "}
            <TableRow>
              <TableHead className="w-[250px]">
                <div className="flex items-center">
                  Name <span className="ml-1">↓</span>
                </div>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>
                <div className="flex items-center">Rating</div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={employee.avatar || ""} />
                      <AvatarFallback className="text-lg">
                        {employee.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-h-[40px] flex flex-col justify-center">
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {employee.role || ""}
                      </div>
                    </div>
                  </div>
                </TableCell>{" "}
                <TableCell>
                  <div>
                    {employee.phone && (
                      <div className="text-sm">+{employee.phone}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>No reviews yet</div>
                </TableCell>{" "}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-4 py-1.5 flex items-center"
                        >
                          Actions <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(employee.id)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            promptDeleteEmployee({
                              id: employee.id,
                              name: employee.name,
                            })
                          }
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}{" "}
          </TableBody>
        </Table>
      </div>{" "}
      {/* Infinite scroll loading trigger for desktop */}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span className="text-sm text-muted-foreground">
              Loading more staff...
            </span>
          </div>
        )}
      </div>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {employeeToDelete?.name} and all
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteEmployee}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
