
// Update StaffList to fetch employee locations correctly
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

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
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
    <div className="bg-white rounded-md shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Locations</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEmployees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
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
                  <div className="font-medium">{employee.name}</div>
                </div>
              </TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>{employee.phone}</TableCell>
              <TableCell>
                <span className="capitalize">{employee.employment_type}</span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={employee.status === "active" ? "outline" : "destructive"}
                  className="capitalize"
                >
                  {employee.status}
                </Badge>
              </TableCell>
              <TableCell>
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(employee.id)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setEmployeeToDelete(employee.id)}
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Delete
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
  );
}
