
import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Info, Pencil, Plus } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { AddShiftDialog } from './dialogs/AddShiftDialog';
import { SetRegularShiftsDialog } from './dialogs/SetRegularShiftsDialog';
import { AddTimeOffDialog } from './dialogs/AddTimeOffDialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SpecificShiftsProps {
  locations: any[];
  selectedLocation: string;
  setSelectedLocation: (locationId: string) => void;
  employees: any[];
}

export function SpecificShifts({ 
  locations,
  selectedLocation,
  setSelectedLocation,
  employees
}: SpecificShiftsProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(selectedDate, { weekStartsOn: 6 })); // Start on Saturday
  const [weekEnd, setWeekEnd] = useState(endOfWeek(selectedDate, { weekStartsOn: 6 }));
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [specificShifts, setSpecificShifts] = useState<any[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<any[]>([]);
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [showSetRegularShiftDialog, setShowSetRegularShiftDialog] = useState(false);
  const [showAddTimeOffDialog, setShowAddTimeOffDialog] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ day: Date, employee: any } | null>(null);
  const { toast } = useToast();

  // Generate week days
  useEffect(() => {
    const days: Date[] = [];
    let day = weekStart;
    
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    setWeekDays(days);
    fetchDataForWeek(days);
  }, [weekStart, selectedLocation]);

  const fetchDataForWeek = async (days: Date[]) => {
    try {
      // Fetch specific shifts for the week
      await fetchShiftsForWeek(days);
      
      // Fetch time off requests that might overlap with this week
      await fetchTimeOffForWeek(days);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchShiftsForWeek = async (days: Date[]) => {
    try {
      // Query for specific shifts in the date range
      let query = supabase.from('shifts')
        .select(`
          *,
          employees(*)
        `)
        .gte('start_time', days[0].toISOString())
        .lte('end_time', days[days.length - 1].toISOString());
      
      // Add location filter if selected
      if (selectedLocation !== "all") {
        query = query.eq('location_id', selectedLocation);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setSpecificShifts(data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch shifts.',
        variant: 'destructive'
      });
    }
  };

  const fetchTimeOffForWeek = async (days: Date[]) => {
    try {
      // We need to handle time off requests that might start before the week but extend into it,
      // or start during the week but extend beyond it
      const weekStart = days[0];
      const weekEnd = days[6];
      
      let query = supabase.from('time_off_requests')
        .select('*')
        .or(`start_date.lte.${format(weekEnd, 'yyyy-MM-dd')},end_date.gte.${format(weekStart, 'yyyy-MM-dd')}`);
      
      // Add location filter if selected
      if (selectedLocation !== "all") {
        query = query.eq('location_id', selectedLocation);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setTimeOffRequests(data || []);
    } catch (error) {
      console.error('Error fetching time off requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch time off requests.',
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

  const handleCellClick = (day: Date, employee: any) => {
    setSelectedCell({ day, employee });
  };

  const isEmployeeOnTimeOff = (day: Date, employeeId: string) => {
    return timeOffRequests.some(timeOff => {
      if (timeOff.employee_id !== employeeId || timeOff.status !== 'approved') {
        return false;
      }
      
      const startDate = new Date(timeOff.start_date);
      const endDate = new Date(timeOff.end_date);
      
      // Normalize the dates to compare only year, month, day
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      const checkDay = new Date(day);
      checkDay.setHours(12, 0, 0, 0);
      
      return checkDay >= startDate && checkDay <= endDate;
    });
  };

  const getShiftsForDayEmployee = (day: Date, employeeId: string) => {
    // Check for time off first - this takes priority
    const timeOff = timeOffRequests.find(timeOff => {
      if (timeOff.employee_id !== employeeId || timeOff.status !== 'approved') {
        return false;
      }
      
      const startDate = new Date(timeOff.start_date);
      const endDate = new Date(timeOff.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      const checkDay = new Date(day);
      checkDay.setHours(12, 0, 0, 0);
      
      return checkDay >= startDate && checkDay <= endDate;
    });
    
    if (timeOff) {
      return [{
        isTimeOff: true,
        reason: timeOff.reason || 'Time Off',
        id: timeOff.id
      }];
    }
    
    // If no time off, return specific shifts
    return specificShifts.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      return isSameDay(shiftDate, day) && shift.employee_id === employeeId;
    });
  };

  const handleDialogClose = (saved: boolean = false) => {
    setShowAddShiftDialog(false);
    setShowSetRegularShiftDialog(false);
    setShowAddTimeOffDialog(false);
    setSelectedCell(null);
    
    if (saved) {
      fetchDataForWeek(weekDays);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Specific Shifts</h2>
        <div className="flex space-x-2">
          <Button variant="outline" className="hidden md:flex">
            Options
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="default" onClick={() => setShowAddShiftDialog(true)}>
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
            <option value="all">All Locations</option>
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
                  <div className="text-xs text-gray-500">
                    {calculateTotalHours(day, specificShifts)}h
                  </div>
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
                <tr key={employee.id} className="border-t">
                  <td className="py-3 px-4">
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
                  
                  {weekDays.map((day) => {
                    const shifts = getShiftsForDayEmployee(day, employee.id);
                    const hasTimeOff = shifts.length > 0 && shifts[0].isTimeOff;
                    
                    return (
                      <td 
                        key={day.toString()} 
                        className="p-1 align-top border cursor-pointer hover:bg-gray-50 relative group"
                        onClick={() => handleCellClick(day, employee)}
                      >
                        {shifts.length > 0 ? (
                          <div className={`p-2 rounded text-center text-sm ${hasTimeOff ? 'bg-red-100' : 'bg-blue-100'}`}>
                            {shifts.map((shift, idx) => (
                              <div key={`${shift.id}-${idx}`}>
                                {shift.isTimeOff ? (
                                  <span className="font-medium text-red-700">{shift.reason}</span>
                                ) : (
                                  `${format(parseISO(shift.start_time), 'h:mm a')} - ${format(parseISO(shift.end_time), 'h:mm a')}`
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-12" />
                        )}
                        
                        <div className="hidden group-hover:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="bg-white">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48" align="center">
                              <div className="flex flex-col space-y-2">
                                <Button 
                                  variant="ghost" 
                                  className="w-full justify-start"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCell({ day, employee });
                                    setShowAddShiftDialog(true);
                                  }}
                                >
                                  Add specific shift
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="w-full justify-start"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCell({ day, employee });
                                    setShowSetRegularShiftDialog(true);
                                  }}
                                >
                                  Set regular shifts
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="w-full justify-start"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCell({ day, employee });
                                    setShowAddTimeOffDialog(true);
                                  }}
                                >
                                  Add time off
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg flex items-start">
        <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
        <p className="text-sm">
          Click on any cell to add a specific shift for that day and employee. Time off requests (in red) override shifts.
        </p>
      </div>

      {showAddShiftDialog && selectedCell && (
        <AddShiftDialog
          isOpen={showAddShiftDialog}
          onClose={handleDialogClose}
          selectedDate={selectedCell.day}
          selectedEmployee={selectedCell.employee}
          employees={employees}
          locations={locations}
          selectedLocation={selectedLocation}
        />
      )}

      {showSetRegularShiftDialog && selectedCell && (
        <SetRegularShiftsDialog
          isOpen={showSetRegularShiftDialog}
          onClose={handleDialogClose}
          employee={selectedCell.employee}
          onSave={() => handleDialogClose(true)}
          locationId={selectedLocation}
        />
      )}

      {showAddTimeOffDialog && selectedCell && (
        <AddTimeOffDialog
          isOpen={showAddTimeOffDialog}
          onClose={handleDialogClose}
          employees={employees}
          selectedEmployee={selectedCell.employee}
          locations={locations}
          selectedLocation={selectedLocation}
        />
      )}
      
      {/* Mobile add button */}
      <Button 
        className="fixed bottom-4 right-4 md:hidden rounded-full h-14 w-14 flex items-center justify-center shadow-lg" 
        size="icon"
        onClick={() => setShowAddShiftDialog(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

// Helper function to calculate total hours for a day across all employees
function calculateTotalHours(day: Date, shifts: any[]): string {
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
  
  // Return formatted string
  const hours = Math.floor(totalMinutes / 60);
  if (hours > 0) {
    return `${hours}`;
  }
  return "0";
}
