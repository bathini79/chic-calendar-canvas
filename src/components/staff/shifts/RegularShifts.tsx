
import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Info, Pencil, Plus } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { StaffMemberRow } from './StaffMemberRow';

interface RegularShiftsProps {
  locations: any[];
  selectedLocation: string;
  setSelectedLocation: (locationId: string) => void;
  employees: any[];
}

export function RegularShifts({ 
  locations,
  selectedLocation,
  setSelectedLocation,
  employees
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

  useEffect(()=>{
    if (locations?.length > 0) {
      setSelectedLocation(locations[0]?.id)
    }
  }, [locations, setSelectedLocation])

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
        <div className="flex space-x-2">
          <Button variant="outline" className="hidden md:flex">
            Options
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="default">
            Add
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <select 
            className="border rounded-md p-2"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
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
                  <div className="text-xs text-gray-500">{calculateHours(day, specificShifts)}h</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4">No staff members found</td>
              </tr>
            ) : (
              employees.map((employee) => (
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

      <div className="bg-blue-50 p-4 rounded-lg flex items-start">
        <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
        <p className="text-sm">
          The team roster shows your availability for bookings and is not linked to your business opening hours.
          To set your opening hours, <a href="#" className="text-blue-500">click here</a>.
        </p>
      </div>
      
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
