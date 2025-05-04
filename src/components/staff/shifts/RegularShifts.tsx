import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { StaffMemberRow } from './StaffMemberRow';
import { DataPagination, STANDARD_PAGE_SIZES } from "@/components/common/DataPagination";
import { Input } from "@/components/ui/input";

interface RegularShiftsProps {
  locations: any[];
  selectedLocation: string;
  setSelectedLocation: (locationId: string) => void;
  employees: any[];
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function RegularShifts({ 
  locations,
  selectedLocation,
  setSelectedLocation,
  employees,
  searchQuery,
  onSearchChange
}: RegularShiftsProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(selectedDate, { weekStartsOn: 6 })); // Start on Saturday
  const [weekEnd, setWeekEnd] = useState(endOfWeek(selectedDate, { weekStartsOn: 6 }));
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [recurringShifts, setRecurringShifts] = useState<any[]>([]);
  const [specificShifts, setSpecificShifts] = useState<any[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<any[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const { toast } = useToast();
  
  // Add pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(STANDARD_PAGE_SIZES[0]); // Use first standard size (10)
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (locations?.length > 0) {
      setSelectedLocation(locations[0]?.id);
    }
  }, [locations, setSelectedLocation]);

  // Filter employees based on search query
  useEffect(() => {
    if (!employees) {
      setFilteredEmployees([]);
      setTotalCount(0);
      return;
    }
    
    let filtered = employees;
    
    if (searchQuery) {
      filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setTotalCount(filtered.length);
    
    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedEmployees = filtered.slice(startIndex, startIndex + pageSize);
    
    setFilteredEmployees(paginatedEmployees);
  }, [employees, searchQuery, currentPage, pageSize]);

  // Generate week days
  useEffect(() => {
    const days: Date[] = [];
    let day = weekStart;
    
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    setWeekDays(days);
    fetchShiftsForWeek(days);
  }, [weekStart, selectedLocation, dataVersion]);

  // Function to refresh data
  const refreshData = () => {
    setDataVersion(prev => prev + 1);
  };

  const fetchShiftsForWeek = async (days: Date[]) => {
    try {
      // Prepare date strings for time off requests
      const startDateStr = days[0].toISOString().split('T')[0];
      const endDateStr = days[days.length - 1].toISOString().split('T')[0];
      
      // Fetch recurring shifts
      const weekDayNumbers = days.map(day => day.getDay());
      
      // Query for recurring shifts
      let recurringQuery = supabase.from('recurring_shifts')
        .select(`
          *,
          employees (*)
        `)
        .in('day_of_week', weekDayNumbers)
        .lte('effective_from', days[days.length - 1].toISOString());
      
      // Add location filter if selected
      if (selectedLocation !== "all") {
        recurringQuery = recurringQuery.eq('location_id', selectedLocation);
      }

      const { data: recurringData, error: recurringError } = await recurringQuery;
      
      if (recurringError) {
        console.error('Recurring shifts error:', recurringError);
        throw recurringError;
      }
      
      // Query for specific shifts in the date range
      let specificQuery = supabase.from('shifts')
        .select(`
          *,
          employees (*)
        `)
        .gte('start_time', days[0].toISOString())
        .lte('end_time', days[days.length - 1].toISOString());

      // Add location filter if selected
      if (selectedLocation !== "all") {
        specificQuery = specificQuery.eq('location_id', selectedLocation);
      }
      
      const { data: specificData, error: specificError } = await specificQuery;
      
      if (specificError) {
        console.error('Specific shifts error:', specificError);
        throw specificError;
      }
      
      // Query for time off requests that overlap with the week
      let timeOffQuery = supabase.from('time_off_requests')
        .select(`
          *,
          employees(*)
        `)
        .or(`start_date.lte.${endDateStr},end_date.gte.${startDateStr}`);
      
      // Add location filter if selected
      if (selectedLocation !== "all") {
        timeOffQuery = timeOffQuery.eq('location_id', selectedLocation);
      }
      
      const { data: timeOffData, error: timeOffError } = await timeOffQuery;
      
      if (timeOffError) {
        console.error('Time off error:', timeOffError);
        throw timeOffError;
      }
      
      setRecurringShifts(recurringData || []);
      setSpecificShifts(specificData || []);
      setTimeOffRequests(timeOffData || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch shifts.',
        variant: 'destructive'
      });
    }
  };

  const goToPreviousWeek = () => {
    const newWeekStart = addDays(weekStart, -7);
    setWeekStart(newWeekStart);
    setWeekEnd(addDays(newWeekStart, 6));
  };

  const goToNextWeek = () => {
    const newWeekStart = addDays(weekStart, 7);
    setWeekStart(newWeekStart);
    setWeekEnd(addDays(newWeekStart, 6));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Scheduled shifts</h2>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center space-x-2">
          <select 
            className="border rounded-md p-2"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={onSearchChange}
              className="pl-9 h-10 w-[200px] lg:w-[250px]"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM, yyyy')}
          </span>
          <Button variant="ghost" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="w-52 text-left px-4 py-2">Team member</th>
              {weekDays.map((day) => (
                <th key={day.toString()} className="text-center px-4 py-2">
                  <div>{format(day, 'EEE, d MMM')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-lg font-medium mb-2">No staff members found</p>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? `No results for "${searchQuery}"`
                        : "No staff members available for this location"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <StaffMemberRow 
                  key={employee.id} 
                  employee={employee}
                  weekDays={weekDays}
                  recurringShifts={recurringShifts.filter(shift => shift.employee_id === employee.id)}
                  specificShifts={specificShifts.filter(shift => shift.employee_id === employee.id)}
                  timeOffRequests={timeOffRequests.filter(req => req.employee_id === employee.id)}
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onDataChange={refreshData}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
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
      )}
      
      {/* Mobile add button */}
      <Button className="fixed bottom-4 right-4 md:hidden rounded-full h-14 w-14 flex items-center justify-center shadow-lg" size="icon">
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

// Helper function to calculate total hours for a day
function calculateHours(day: Date, shifts: any[]): string {
  const dayShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.start_time);
    return shiftDate.getDate() === day.getDate() &&
      shiftDate.getMonth() === day.getMonth() &&
      shiftDate.getFullYear() === day.getFullYear();
  });
  
  let totalMinutes = 0;
  
  dayShifts.forEach(shift => {
    const startTime = new Date(shift.start_time);
    const endTime = new Date(shift.end_time);
    const diffInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    totalMinutes += diffInMinutes;
  });
  
  // Return formatted string like "9h" or "0min"
  const hours = Math.floor(totalMinutes / 60);
  if (hours > 0) {
    return `${hours}h`;
  }
  return "0min";
}
