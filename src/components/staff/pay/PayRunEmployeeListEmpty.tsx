import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoaderCircle, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  name: string;
  email: string;
  initials: string;
}

interface PayRunEmployeeListEmptyProps {
  searchQuery: string;
  locationId?: string;
  onCreatePayRun: () => void;
}

export function PayRunEmployeeListEmpty({ 
  searchQuery, 
  locationId,
  onCreatePayRun
}: PayRunEmployeeListEmptyProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load employees
  useEffect(() => {
    async function fetchEmployees() {
      setIsLoading(true);
      
      try {        // Query structure depends on whether we're filtering by location
        let query = supabase.from("employees").select("id, name, email");
        
        // Filter by location if provided
        if (locationId && locationId !== "all") {
          query = query.eq("location_id", locationId);
        }
        
        // Filter by search query if provided
        if (searchQuery) {
          // The employees table uses 'name' field
          query = query.ilike("name", `%${searchQuery}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;        // Process employee data to add initials
        const processedEmployees = (data || []).map(emp => ({
          ...emp,
          initials: getInitials(emp.name)
        }));
        
        console.log('Found employees:', processedEmployees);
        setEmployees(processedEmployees);
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchEmployees();
  }, [locationId, searchQuery]);

  // Helper to get initials from name
  function getInitials(name: string): string {
    if (!name) return "";
    
    const nameParts = name.split(" ");
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return (
      nameParts[0].charAt(0).toUpperCase() + 
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  }

  // Format currency
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (!employees.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No employees found{searchQuery ? ` matching "${searchQuery}"` : ""}.
        <p className="mt-2 text-sm">
          {locationId && locationId !== "all" ? 
            "Try removing the location filter." : 
            "Please add employees to see them listed here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Employee List */}
      <div className="divide-y divide-border rounded-md border">
        {employees.map((employee) => {
          // All values are zero since there's no pay run
          return (
            <div key={employee.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{employee.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{employee.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {employee.email}
                  </p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-4">
                <div className="w-24 text-right">
                  <div className="text-sm">{formatCurrency(0)}</div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-sm">{formatCurrency(0)}</div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-sm">{formatCurrency(0)}</div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-sm">{formatCurrency(0)}</div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-sm">{formatCurrency(0)}</div>
                </div>
              </div>
              
              <div className="md:hidden">
                <div className="text-sm font-medium">
                  {formatCurrency(0)}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" disabled>
                    Actions <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    View breakdown
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    Add adjustment
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-center mt-6">
        <Button 
          onClick={onCreatePayRun}
          className="bg-black text-white hover:bg-gray-800"
        >
          Create Pay Run to Add Payments
        </Button>
      </div>
    </div>
  );
}
