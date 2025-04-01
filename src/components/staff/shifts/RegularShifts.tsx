import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { RegularShiftsActions } from './RegularShiftsActions';
import { SetRegularShiftsDialog } from './dialogs/SetRegularShiftsDialog';

export function RegularShifts({
  locations,
  selectedLocation,
  setSelectedLocation,
  employees
}: {
  locations: any[];
  selectedLocation: string;
  setSelectedLocation: (locationId: string) => void;
  employees: any[];
}) {
  const [recurringShifts, setRecurringShifts] = useState<any[]>([]);
  const [specificShifts, setSpecificShifts] = useState<any[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<any[]>([]);
  const [showSetRegularShiftDialog, setShowSetRegularShiftDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [dataVersion, setDataVersion] = useState(0);
  
  // Weekdays starting from Sunday (0) to Saturday (6)
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
    return {
      day: getDayName(dayIndex),
      dayIndex
    };
  });
  
  function getDayName(dayIndex: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  }

  // Fetch recurring shifts when location changes
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        // Fetch recurring shifts
        let query = supabase.from('recurring_shifts')
          .select('*');
        
        // Filter by location if selected
        if (selectedLocation && selectedLocation !== "all") {
          query = query.eq('location_id', selectedLocation);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        setRecurringShifts(data || []);
        
        // Fetch specific shifts for the current week
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Previous Sunday
        
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (6 - now.getDay())); // Next Saturday
        
        let specificQuery = supabase.from('shifts')
          .select('*')
          .gte('start_time', startOfWeek.toISOString())
          .lte('start_time', endOfWeek.toISOString());
        
        if (selectedLocation && selectedLocation !== "all") {
          specificQuery = specificQuery.eq('location_id', selectedLocation);
        }
        
        const { data: specificData, error: specificError } = await specificQuery;
        if (specificError) throw specificError;
        
        setSpecificShifts(specificData || []);

        // Fetch time off requests
        let timeOffQuery = supabase.from('time_off_requests')
          .select('*');
        
        if (selectedLocation && selectedLocation !== "all") {
          timeOffQuery = timeOffQuery.eq('location_id', selectedLocation);
        }
        
        const { data: timeOffData, error: timeOffError } = await timeOffQuery;
        if (timeOffError) throw timeOffError;
        
        setTimeOffRequests(timeOffData || []);
      } catch (error) {
        console.error('Error fetching shifts:', error);
      }
    };
    
    fetchShifts();
  }, [selectedLocation, dataVersion]);

  const refreshData = () => {
    setDataVersion(prev => prev + 1);
  };

  const handleSetRegularShifts = (employee: any) => {
    setSelectedEmployee(employee);
    setShowSetRegularShiftDialog(true);
  };

  const getEmployeeShifts = (employeeId: string, dayOfWeek: number) => {
    const employeeRegularShifts = recurringShifts
      .filter(shift => shift.employee_id === employeeId && shift.day_of_week === dayOfWeek);
    
    // Check time off requests that overlap with this day
    const today = new Date();
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - today.getDay() + dayOfWeek); // Set to the current week's corresponding day
    
    const hasTimeOff = timeOffRequests.some(timeOff => {
      const startDate = new Date(timeOff.start_date);
      const endDate = new Date(timeOff.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      const checkDay = new Date(dayDate);
      checkDay.setHours(0, 0, 0, 0);
      
      return (
        checkDay >= startDate && 
        checkDay <= endDate && 
        timeOff.employee_id === employeeId &&
        (timeOff.status === 'approved' || timeOff.status === 'pending')
      );
    });
    
    if (hasTimeOff) {
      const timeOff = timeOffRequests.find(t => {
        const startDate = new Date(t.start_date);
        const endDate = new Date(t.end_date);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        const checkDay = new Date(dayDate);
        checkDay.setHours(0, 0, 0, 0);
        
        return (
          checkDay >= startDate && 
          checkDay <= endDate && 
          t.employee_id === employeeId &&
          (t.status === 'approved' || t.status === 'pending')
        );
      });
      
      return { hasTimeOff: true, timeOff };
    }
    
    return { hasTimeOff: false, shifts: employeeRegularShifts };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Regular Weekly Schedule</h2>
        <div>
          <select 
            className="border rounded-md p-2"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left px-4 py-2">Team Member</th>
              {weekDays.map(({ day, dayIndex }) => (
                <th key={dayIndex} className="px-4 py-2 text-center">{day}</th>
              ))}
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-4">No staff members found</td>
              </tr>
            ) : (
              employees.map(employee => (
                <tr key={employee.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 rounded-full h-10 w-10 flex items-center justify-center">
                        {employee.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.employment_type}</p>
                      </div>
                    </div>
                  </td>
                  
                  {weekDays.map(({ dayIndex }) => {
                    const { hasTimeOff, timeOff, shifts } = getEmployeeShifts(employee.id, dayIndex);
                    
                    return (
                      <td key={dayIndex} className="px-4 py-3 text-center border-l">
                        {hasTimeOff ? (
                          <div className={`p-1 rounded ${
                            timeOff.status === 'approved' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            Time Off
                            <div className="text-xs">
                              ({timeOff.status === 'approved' ? 'Approved' : 'Pending'})
                            </div>
                          </div>
                        ) : (
                          <div>
                            {shifts && shifts.length > 0 ? (
                              shifts.map((shift, index) => (
                                <div key={index} className="text-sm mb-1">
                                  {formatTimeAMPM(shift.start_time)} - {formatTimeAMPM(shift.end_time)}
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  
                  <td className="px-4 py-3 text-center">
                    <RegularShiftsActions 
                      employee={employee} 
                      onSetRegularShifts={() => handleSetRegularShifts(employee)}
                      onRefreshData={refreshData}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showSetRegularShiftDialog && selectedEmployee && (
        <SetRegularShiftsDialog
          isOpen={showSetRegularShiftDialog}
          onClose={(saved) => {
            setShowSetRegularShiftDialog(false);
            if (saved) refreshData();
          }}
          employee={selectedEmployee}
          onSave={refreshData}
          locationId={selectedLocation !== "all" ? selectedLocation : undefined}
        />
      )}
    </div>
  );
}

function formatTimeAMPM(timeString: string) {
  if (!timeString) return '';
  
  const [hourStr, minuteStr] = timeString.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
  
  return `${displayHour}:${minute} ${period}`;
}
