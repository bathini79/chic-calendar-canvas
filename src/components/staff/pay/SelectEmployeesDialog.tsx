import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { LoaderCircle, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface Employee {
  id: string;
  name: string;
  email: string;
  initials: string;
  locations?: { id: string; name: string }[];
  isSelected: boolean;
}

interface Location {
  id: string;
  name: string;
}

interface SelectEmployeesDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedEmployeeIds: string[]) => void;
  locationId?: string;
}

export function SelectEmployeesDialog({
  open,
  onClose,
  onConfirm,
  locationId,
}: SelectEmployeesDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>(locationId || "all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Load locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data, error } = await supabase
          .from("locations")
          .select("id, name")
          .order("name");
        
        if (error) throw error;
        setLocations(data || []);
      } catch (error) {
        console.error("Error loading locations:", error);
      }
    }
    
    fetchLocations();
  }, []);
    // Load employees with location filtering
  useEffect(() => {
    async function fetchEmployees() {
      setIsLoading(true);
      try {
        // First, fetch all employees with active status to ensure we only get current employees
        let employeeQuery = supabase.from("employees").select("id, name, email")
          .eq("status", "active"); // Only get active employees
        
        // Apply search filter if present
        if (searchQuery) {
          employeeQuery = employeeQuery.ilike("name", `%${searchQuery}%`);
        }
        
        const { data: employeeData, error: employeeError } = await employeeQuery;
        
        if (employeeError) {
          console.error("Error fetching employees:", employeeError);
          toast({
            title: "Error",
            description: "Could not load team members",
            variant: "destructive"
          });
          setEmployees([]);
          return;
        }
        
        // Fetch all locations
        const { data: allLocations, error: locationError } = await supabase
          .from("locations")
          .select("id, name");
        
        if (locationError) {
          console.error("Error fetching locations:", locationError);
          toast({
            title: "Error",
            description: "Could not load locations",
            variant: "destructive"
          });
          // Continue with employees but without location data
        }
        
        const locationMap = new Map<string, string>();
        (allLocations || []).forEach(loc => locationMap.set(loc.id, loc.name));
        
        // Fetch employee-location relationships
        let relationshipsQuery = supabase.from("employee_locations").select("*");
        
        const { data: employeeLocations, error: relError } = await relationshipsQuery;
        
        if (relError) {
          console.error("Error fetching employee-location relationships:", relError);
          // Continue with employees but without location relationships
        }
        
        // Build a map of employee to locations
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
        
        // Filter employees by location if needed
        let filteredEmployees = employeeData || [];
        if (selectedLocation && selectedLocation !== "all") {
          filteredEmployees = filteredEmployees.filter(emp => 
            employeeToLocationsMap.has(emp.id) && 
            employeeToLocationsMap.get(emp.id)?.some(loc => loc.id === selectedLocation)
          );
        }
        
        // Map to our Employee type with initials and locations
        const employeesWithDetails = filteredEmployees.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email || "",
          initials: getInitials(emp.name),
          locations: employeeToLocationsMap.get(emp.id) || [],
          isSelected: true, // Default to selecting all employees
        }));
        
        setEmployees(employeesWithDetails);
      } catch (error) {
        console.error("Error in employee selection workflow:", error);
        toast({
          title: "Error",
          description: "Something went wrong loading team members",
          variant: "destructive"
        });
        setEmployees([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchEmployees();
  }, [searchQuery, selectedLocation]);

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

  // Handle selecting/deselecting all employees
  const toggleSelectAll = (checked: boolean) => {
    setEmployees(employees.map(emp => ({
      ...emp,
      isSelected: checked
    })));
  };
  
  // Handle selecting/deselecting a single employee
  const toggleSelectEmployee = (id: string, checked: boolean) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? {...emp, isSelected: checked} : emp
    ));
  };
  
  // Handle confirmation
  const handleConfirm = () => {
    const selectedIds = employees
      .filter(emp => emp.isSelected)
      .map(emp => emp.id);
    
    onConfirm(selectedIds);
  };
  
  // Check if all employees are selected
  const allSelected = employees.length > 0 && employees.every(emp => emp.isSelected);
  const someSelected = employees.some(emp => emp.isSelected);
  const selectedCount = employees.filter(emp => emp.isSelected).length;  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`
          !top-auto !bottom-0 left-1/2 translate-x-[-50%] !translate-y-0 w-[98vw] max-w-none border shadow-xl rounded-t-2xl !rounded-b-none overflow-hidden flex flex-col
          ${
            isMobile
              ? "h-[95vh] pt-[0.5%] px-[1.5%]"
              : "h-[98vh] pt-[3%] pl-[10%] pr-[10%]"
          }`}
      >        <div className="flex justify-end mt-0 mb-0 mr-0 gap-3 absolute top-2 right-2 z-10">
          {isMobile ? (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="p-1.5 h-auto w-auto border-none shadow-none bg-transparent hover:bg-transparent"
            >
              <X size={20} strokeWidth={2.5} className="text-gray-600" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="whitespace-nowrap"
              >
                Close
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!someSelected}
                className="bg-black hover:bg-gray-800 text-white whitespace-nowrap px-6"
              >
                Next
              </Button>
            </>
          )}
        </div>
        
        <DialogHeader className={`flex justify-between items-start ${
          isMobile ? "text-left mt-3" : ""
        }`}>
          <div className={isMobile ? "w-full text-left" : ""}>
            <DialogTitle className={`!text-[1.75rem] font-semibold ${
              isMobile ? "text-left" : ""
            }`}>
              Select Team Members
            </DialogTitle>
            <DialogDescription>
              Choose which team members to include in this payment run.
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
              <SelectTrigger className="md:w-[180px]">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Employee list with checkboxes */}
          <div className="border rounded-md overflow-hidden">
            {/* Header with select all */}
            <div className="bg-muted px-4 py-3 flex items-center border-b">
              <div className="flex items-center">
                <Checkbox 
                  id="select-all" 
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  className="mr-2" 
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All
                </label>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                {selectedCount} of {employees.length} selected
              </div>
            </div>            {/* Scrollable employee list */}
            <div className={`overflow-y-auto ${isMobile ? "max-h-[55vh]" : "max-h-[60vh]"}`}>
              {isLoading ? (
                <div className="flex flex-col justify-center items-center py-8">
                  <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Loading team members...</p>
                </div>
              ) : employees.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="inline-block p-3 rounded-full bg-muted mb-2">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No team members found</p>
                  {searchQuery && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search or location filter
                    </p>
                  )}
                </div>
              ) : (
                employees.map(employee => (
                  <div 
                    key={employee.id}
                    className="px-4 py-3 border-b last:border-0 flex items-center hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox 
                      id={`employee-${employee.id}`}
                      checked={employee.isSelected}
                      onCheckedChange={(checked) => toggleSelectEmployee(employee.id, !!checked)}
                      className="mr-3"
                    />
                    <label 
                      htmlFor={`employee-${employee.id}`}
                      className="flex flex-1 items-center cursor-pointer"
                    >
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarFallback>{employee.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{employee.name}</div>
                        {employee.locations.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {employee.locations.map(loc => loc.name).join(', ')}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))
              )}
            </div>          </div>
        </div>
        
        {/* Sticky footer for mobile */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50 flex justify-end gap-3">
            <Button
              onClick={handleConfirm}
              disabled={!someSelected}
              className="whitespace-nowrap px-6 flex-1 bg-black hover:bg-gray-800 text-white"
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
