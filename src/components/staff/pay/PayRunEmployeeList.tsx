import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoaderCircle, ChevronDown, Search, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePayroll } from "@/hooks/use-payroll";
import { AdjustmentModal } from "./AdjustmentModal";
import { PaymentBreakdown } from "./PaymentBreakdown";

interface Employee {
  id: string;
  name: string;
  email: string;
  initials: string;
  locations?: { id: string; name: string }[];
}

interface PayRunEmployeeListProps {
  payRunId: string;
  searchQuery: string;
  locationId?: string;
}

export function PayRunEmployeeList({ payRunId, searchQuery, locationId }: PayRunEmployeeListProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adjustmentEmployee, setAdjustmentEmployee] = useState<Employee | null>(null);
  const [breakdownEmployeeId, setBreakdownEmployeeId] = useState<string | null>(null);
  
  // Custom hooks
  const { usePayRunEmployeeSummaries } = usePayroll();
  
  // Get employee pay data directly from SQL function
  const { data: employeeSummaries, isLoading: isLoadingSummaries } = usePayRunEmployeeSummaries(payRunId);
  
  // Load employees
  useEffect(() => {
    async function fetchEmployees() {
      setIsLoading(true);
      
      try {
        let employeeQuery = supabase.from("employees").select("id, name, email");
        
        if (searchQuery) {
          employeeQuery = employeeQuery.ilike("name", `%${searchQuery}%`);
        }
        
        const { data: employeeData, error: employeeError } = await employeeQuery;
        
        if (employeeError) throw employeeError;
        
        // Fetch all locations
        const { data: allLocations, error: locationError } = await supabase
          .from("locations")
          .select("id, name");
        
        if (locationError) throw locationError;
        
        const locationMap = new Map<string, string>();
        (allLocations || []).forEach(loc => locationMap.set(loc.id, loc.name));
        
        let relationshipsQuery = supabase.from("employee_locations").select("*");
        
        if (locationId && locationId !== "all") {
          relationshipsQuery = relationshipsQuery.eq("location_id", locationId);
        }
        
        const { data: employeeLocations, error: relError } = await relationshipsQuery;
        
        if (relError) throw relError;
        
        const employeeToLocationsMap = new Map<string, { id: string; name: string }[]>();
        
        (employeeLocations || []).forEach(rel => {
          if (!employeeToLocationsMap.has(rel.employee_id)) {
            employeeToLocationsMap.set(rel.employee_id, []);
          }
          
          const locationName = locationMap.get(rel.location_id) || "Unknown";
          employeeToLocationsMap.get(rel.employee_id)?.push({
            id: rel.location_id,
            name: locationName
          });
        });
        
        let filteredEmployees = employeeData || [];
        if (locationId && locationId !== "all") {
          filteredEmployees = filteredEmployees.filter(emp => 
            employeeToLocationsMap.has(emp.id) && 
            employeeToLocationsMap.get(emp.id)?.some(loc => loc.id === locationId)
          );
        }
        
        const processedEmployees = filteredEmployees.map(emp => ({
          ...emp,
          initials: getInitials(emp.name),
          locations: employeeToLocationsMap.get(emp.id) || []
        }));
        
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
  
  function handleViewBreakdown(employeeId: string) {
    setBreakdownEmployeeId(employeeId);
  }
  
  function handleAddAdjustment(employee: Employee) {
    setAdjustmentEmployee(employee);
  }
  
  if (isLoading || isLoadingSummaries) {
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
      </div>
    );
  }
  
  return (
    <div>
      <div className="divide-y divide-border bg-white rounded-md shadow-sm">
        {employees.map((employee, index) => {
          const payData = employeeSummaries?.[employee.id] || {
            earnings: 0,
            other: 0,
            total: 0,
            paid: 0,
            toPay: 0
          };
          
          const isAlternate = index % 2 === 1;
          
          return (
            <div key={employee.id} className={cn(
              "flex flex-col md:flex-row md:items-center md:justify-between p-2 md:p-3 hover:bg-muted/10 transition-colors",
              isAlternate && "bg-muted/5"
            )}>
              <div className="flex items-center gap-2 md:gap-3 md:w-[180px]">
                <Avatar className="h-8 w-8 md:h-9 md:w-9">
                  <AvatarFallback className="bg-primary/10 text-primary">{employee.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium text-sm leading-tight">{employee.name}</h3>
                  <div className="hidden md:flex flex-wrap items-center gap-1 mt-1">
                    {employee.locations && employee.locations.length > 0 ? (
                      employee.locations.map(location => (
                        <div key={location.id} className="bg-muted px-1.5 py-0.5 rounded text-xs text-muted-foreground">
                          {location.name}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground">No assigned location</div>
                    )}
                  </div>
                  <div className="md:hidden text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {employee.locations && employee.locations.length > 0
                      ? employee.locations.map((loc, index) => (
                          <span key={loc.id}>
                            {loc.name}{index < employee.locations.length - 1 ? ', ' : ''}
                          </span>
                        ))
                      : "No location"}
                  </div>
                </div>
              </div>
              
              <div className="md:hidden flex justify-between items-center mt-1 mb-0">
                <span className="text-sm font-medium">{formatCurrency(payData.total)}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-full w-full flex items-center justify-center">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handleViewBreakdown(employee.id)}>
                        View breakdown
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddAdjustment(employee)}>
                        Add adjustment
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Button>
              </div>
              
              <div className="hidden md:flex flex-1 items-center justify-end gap-8">
                <div className="w-24 text-right">
                  <div className="text-sm">{formatCurrency(payData.earnings)}</div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-sm">{formatCurrency(payData.other)}</div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-sm">{formatCurrency(payData.total)}</div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-sm">{formatCurrency(payData.paid)}</div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-sm">{formatCurrency(payData.toPay)}</div>
                </div>
              </div>
              
              <div className="hidden md:block w-28 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      Actions <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => handleViewBreakdown(employee.id)}>
                      View breakdown
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddAdjustment(employee)}>
                      Add adjustment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {adjustmentEmployee && (
        <AdjustmentModal
          open={!!adjustmentEmployee}
          onClose={() => setAdjustmentEmployee(null)}
          payRunId={payRunId}
          employeeId={adjustmentEmployee.id}
          employeeName={adjustmentEmployee.name}
          onSuccess={() => setAdjustmentEmployee(null)}
        />
      )}
      
      {breakdownEmployeeId && (
        <PaymentBreakdown
          open={!!breakdownEmployeeId}
          onClose={() => setBreakdownEmployeeId(null)}
          payRunId={payRunId}
          employeeId={breakdownEmployeeId}
        />
      )}
    </div>
  );
}
