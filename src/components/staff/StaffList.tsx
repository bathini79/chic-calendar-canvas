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

interface StaffListProps {
  searchQuery: string;
  onEdit: (employeeId: string) => void;
}

export function StaffList({ searchQuery, onEdit }: StaffListProps) {
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const { data: employees = [], isLoading, refetch } = useQuery({
    queryKey: ["employees-with-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          employee_skills(service_id, services:services(name)),
          employee_locations(location_id, locations:locations(name))
        `)
        .order("name");

      if (error) {
        console.error("Error fetching employees:", error);
        throw error;
      }
      
      return data || [];
    },
  });

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteEmployee = async (id: string) => {
    try {
      // First delete from employee_skills and employee_locations
      await supabase.from("employee_skills").delete().eq("employee_id", id);
      await supabase.from("employee_locations").delete().eq("employee_id", id);
      
      // Then delete the employee
      const { error } = await supabase.from("employees").delete().eq("id", id);
      
      if (error) throw error;
      
      refetch();
      setEmployeeToDelete(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
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
                      onClick={() => handleDeleteEmployee(employee.id)}
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
    </div>
  );
}
