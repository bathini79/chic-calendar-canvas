
import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RegularShifts } from './RegularShifts';
import { SpecificShifts } from './SpecificShifts';
import { TimeOffRequests } from './TimeOffRequests';
import { supabase } from "@/integrations/supabase/client";

export function StaffShifts() {
  const [activeTab, setActiveTab] = useState("regular");
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [dataVersion, setDataVersion] = useState(0);

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
            employee_locations(*)
          `)
          .eq('employment_type', 'stylist')
          .eq('status', 'active');
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Filter by location if needed
        let filteredEmployees = data || [];
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="regular" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="regular">Regular Shifts</TabsTrigger>
          <TabsTrigger value="specific">Specific Shifts</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
        </TabsList>
        
        <TabsContent value="regular" className="mt-0">
          <RegularShifts 
            locations={locations}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            employees={employees}
            onDataChange={refreshData}
          />
        </TabsContent>
        
        <TabsContent value="specific" className="mt-0">
          <SpecificShifts 
            locations={locations}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            employees={employees}
          />
        </TabsContent>
        
        <TabsContent value="timeoff" className="mt-0">
          <TimeOffRequests 
            locations={locations}
            employees={employees}
            selectedLocation={selectedLocation} 
            onDataChange={refreshData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
