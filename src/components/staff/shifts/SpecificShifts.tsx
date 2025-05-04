import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Info, Pencil, Plus, Search } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { AddShiftDialog } from './dialogs/AddShiftDialog';
import { SetRegularShiftsDialog } from './dialogs/SetRegularShiftsDialog';
import { AddTimeOffDialog } from './dialogs/AddTimeOffDialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { DataPagination, STANDARD_PAGE_SIZES } from "@/components/common/DataPagination";

interface SpecificShiftsProps {
  locations: any[];
  selectedLocation: string;
  setSelectedLocation: (locationId: string) => void;
  employees: any[];
  searchQuery: string;
}

export function SpecificShifts({ 
  locations,
  selectedLocation,
  setSelectedLocation,
  employees,
  searchQuery
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
  const [dataVersion, setDataVersion] = useState(0);
  const { toast } = useToast();
  
  // Add search and pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(STANDARD_PAGE_SIZES[0]); // Use first standard size (10)
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

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

  const fetchShiftsForWeek = async (days: Date[]) => {
    try {
      // Prepare date strings for time off requests
      const startDateStr = days[0].toISOString().split('T')[0];
      const endDateStr = days[days.length - 1].toISOString().split('T')[0];

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
      
      if (timeOffError) throw timeOffError;
      
      setSpecificShifts(data || []);
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

  const refreshData = () => {
    setDataVersion(prev => prev + 1);
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
  
  // Check for time off for a specific day and employee
  const getTimeOffForDayEmployee = (day: Date, employeeId: string) => {
    return timeOffRequests.filter(timeOff => {
      const startDate = new Date(timeOff.start_date);
      const endDate = new Date(timeOff.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      const checkDay = new Date(day);
      checkDay.setHours(0, 0, 0, 0);
      
      return checkDay >= startDate && checkDay <= endDate && 
             timeOff.employee_id === employeeId &&
             (timeOff.status === 'approved' || timeOff.status === 'pending');
    });
  };

  const getShiftsForDayEmployee = (day: Date, employeeId: string) => {
    // First check for time off
    const timeOff = getTimeOffForDayEmployee(day, employeeId);
    
    if (timeOff.length > 0) {
      return {
        hasTimeOff: true,
        timeOff: timeOff[0],
        shifts: []
      };
    }
    
    // Then check for specific shifts
    const shifts = specificShifts.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      return isSameDay(shiftDate, day) && shift.employee_id === employeeId;
    });
    
    return {
      hasTimeOff: false,
      timeOff: null,
      shifts
    };
  };

  const handleDialogClose = (shouldRefresh: boolean = false) => {
    setShowAddShiftDialog(false);
    setShowSetRegularShiftDialog(false);
    setShowAddTimeOffDialog(false);
    setSelectedCell(null);
    
    if (shouldRefresh) {
      refreshData();
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
        <div className="flex space-x-2 items-center">
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
                    const { hasTimeOff, timeOff, shifts } = getShiftsForDayEmployee(day, employee.id);
                    
                    return (
                      <td 
                        key={day.toString()} 
                        className="p-1 align-top border cursor-pointer hover:bg-gray-50 relative group"
                        onClick={() => handleCellClick(day, employee)}
                      >
                        {hasTimeOff ? (
                          <div className={`${
                            timeOff.status === 'approved' ? 'bg-red-100' : 'bg-yellow-100'
                          } p-2 rounded text-center text-sm`}>
                            <span className={`font-medium ${
                              timeOff.status === 'approved' ? 'text-red-700' : 'text-yellow-700'
                            }`}>
                              {timeOff.reason || 'Time Off'}
                            </span>
                            <span className="text-xs block">
                              ({timeOff.status === 'approved' ? 'Approved' : 'Pending'})
                            </span>
                          </div>
                        ) : shifts.length > 0 ? (
                          <div className="bg-blue-100 p-2 rounded text-center text-sm">
                            {shifts.map((shift) => (
                              <div key={shift.id}>
                                {format(new Date(shift.start_time), 'h:mma')} - {format(new Date(shift.end_time), 'h:mma')}
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

      <div className="bg-blue-50 p-4 rounded-lg flex items-start">
        <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
        <p className="text-sm">
          Click on any cell to add a specific shift for that day and employee.
        </p>
      </div>

      {showAddShiftDialog && selectedCell && (
        <AddShiftDialog
          isOpen={showAddShiftDialog}
          onClose={(saved) => handleDialogClose(saved)}
          selectedDate={selectedCell.day}
          selectedEmployee={selectedCell.employee}
          employees={[selectedCell.employee]}
          selectedLocation={selectedLocation}
        />
      )}

      {showSetRegularShiftDialog && selectedCell && (
        <SetRegularShiftsDialog
          isOpen={showSetRegularShiftDialog}
          onClose={(saved) => handleDialogClose(saved)}
          employee={selectedCell.employee}
          onSave={() => handleDialogClose(true)}
          locationId={selectedLocation}
        />
      )}

      {showAddTimeOffDialog && selectedCell && (
        <AddTimeOffDialog
          isOpen={showAddTimeOffDialog}
          onClose={(saved) => handleDialogClose(saved)}
          employees={[selectedCell.employee]}
          selectedEmployee={selectedCell.employee}
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
