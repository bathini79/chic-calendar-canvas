
import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { Info } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { StaffMemberRow } from './StaffMemberRow';
import { RegularShiftsActions } from './RegularShiftsActions';

interface RegularShiftsProps {
  locations: any[];
  selectedLocation: string;
  setSelectedLocation: (locationId: string) => void;
  employees: any[];
  onDataChange?: () => void;
}

export function RegularShifts({
  locations,
  selectedLocation,
  setSelectedLocation,
  employees,
  onDataChange = () => {}
}: RegularShiftsProps) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 6 })); // Start on Saturday
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [recurringShifts, setRecurringShifts] = useState<any[]>([]);
  const [specificShifts, setSpecificShifts] = useState<any[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();
  
  // Generate week days for header
  useEffect(() => {
    const days: Date[] = [];
    let day = weekStart;
    
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    setWeekDays(days);
  }, [weekStart]);

  // Load recurring shifts
  useEffect(() => {
    const loadRecurringShifts = async () => {
      try {
        setIsLoading(true);
        let query = supabase
          .from('recurring_shifts')
          .select('*')
          .order('day_of_week');
          
        if (selectedLocation) {
          query = query.eq('location_id', selectedLocation);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setRecurringShifts(data || []);
      } catch (error) {
        console.error('Error loading recurring shifts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load recurring shifts.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRecurringShifts();
  }, [selectedLocation, refreshTrigger]);

  // Load specific shifts for current week
  useEffect(() => {
    const loadSpecificShifts = async () => {
      try {
        if (weekDays.length === 0) return;
        
        const startDate = weekDays[0];
        const endDate = new Date(weekDays[6]);
        endDate.setHours(23, 59, 59);
        
        let query = supabase
          .from('shifts')
          .select('*')
          .gte('start_time', startDate.toISOString())
          .lte('end_time', endDate.toISOString());
          
        if (selectedLocation) {
          query = query.eq('location_id', selectedLocation);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setSpecificShifts(data || []);
      } catch (error) {
        console.error('Error loading specific shifts:', error);
      }
    };
    
    loadSpecificShifts();
  }, [weekDays, selectedLocation, refreshTrigger]);

  // Load time off requests
  useEffect(() => {
    const loadTimeOffRequests = async () => {
      try {
        let query = supabase
          .from('time_off_requests')
          .select('*');
          
        if (selectedLocation) {
          query = query.eq('location_id', selectedLocation);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setTimeOffRequests(data || []);
      } catch (error) {
        console.error('Error loading time off requests:', error);
      }
    };
    
    loadTimeOffRequests();
  }, [selectedLocation, refreshTrigger]);

  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1);
    onDataChange(); // Pass the change up to parent
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Regular Weekly Schedule</h2>
        
        <RegularShiftsActions
          locations={locations}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
        />
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">Loading schedule...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-52 text-left px-4 py-2">Team member</th>
                {weekDays.map((day) => (
                  <th key={day.toString()} className="text-center px-4 py-2">
                    {format(day, 'EEEE')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">No employees found</td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <StaffMemberRow 
                    key={employee.id}
                    employee={employee}
                    weekDays={weekDays}
                    recurringShifts={recurringShifts.filter(shift => 
                      shift.employee_id === employee.id
                    )}
                    specificShifts={specificShifts.filter(shift => 
                      shift.employee_id === employee.id
                    )}
                    timeOffRequests={timeOffRequests.filter(timeOff => 
                      timeOff.employee_id === employee.id
                    )}
                    locations={locations}
                    selectedLocation={selectedLocation}
                    onDataChange={handleDataChange}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg flex items-start">
        <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
        <div>
          <p className="text-sm">
            This schedule shows the team member's regular weekly shifts, as well as any approved time off.
          </p>
          <p className="text-sm mt-2">
            Time off (shown in red) overrides regular shifts. You can add specific shifts for individual days from the "Specific Shifts" tab.
          </p>
        </div>
      </div>
    </div>
  );
}
