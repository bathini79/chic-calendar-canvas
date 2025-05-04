import React, { useState, useEffect } from 'react';
import { RegularShifts } from './RegularShifts';
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';

export function StaffShifts() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase.from('locations').select('*').eq('status', 'active');
        if (error) throw error;
        setLocations(data || []);
        if (data && data.length > 0) {
          setSelectedLocation(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    fetchLocations();
  }, []);

  // Fetch employees based on selected location
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        if (!selectedLocation) return;
        
        let query = supabase.from('employees')
          .select(`
            *,
            employee_locations(*),
            employment_types!inner(permissions)
          `)
          .eq('status', 'active');
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Filter employees to only those with perform_services permission
        let employeesWithPermission = data?.filter(employee => {
          const permissions = employee.employment_types?.permissions || [];
          return Array.isArray(permissions) && permissions.includes('perform_services');
        }) || [];
        
        // Filter by location if needed
        let filteredEmployees = employeesWithPermission;
        if (selectedLocation !== "all") {
          filteredEmployees = filteredEmployees.filter(emp => 
            emp.employee_locations?.some((loc: any) => loc.location_id === selectedLocation)
          );
        }
        
        setEmployees(filteredEmployees);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchEmployees();
  }, [selectedLocation, dataVersion]);

  // Function to refresh data throughout the component
  const refreshData = () => {
    setDataVersion(prev => prev + 1);
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="space-y-6">
      <RegularShifts 
        locations={locations}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        employees={employees}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />
    </div>
  );
}
