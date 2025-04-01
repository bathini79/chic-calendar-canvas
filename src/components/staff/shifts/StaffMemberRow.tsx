
import React from 'react';
import { format, isSameDay } from 'date-fns';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SetRegularShiftsDialog } from './dialogs/SetRegularShiftsDialog';
import { AddShiftDialog } from './dialogs/AddShiftDialog';
import { AddTimeOffDialog } from './dialogs/AddTimeOffDialog';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StaffMemberRowProps {
  employee: any;
  weekDays: Date[];
  recurringShifts: any[];
  specificShifts: any[];
  timeOffRequests: any[];
  locations: any[];
  selectedLocation: string;
  onDataChange: () => void;
}

export function StaffMemberRow({
  employee,
  weekDays,
  recurringShifts,
  specificShifts,
  timeOffRequests,
  locations,
  selectedLocation,
  onDataChange
}: StaffMemberRowProps) {
  const [showSetRegularShiftDialog, setShowSetRegularShiftDialog] = useState(false);
  const [showAddSpecificShiftDialog, setShowAddSpecificShiftDialog] = useState(false);
  const [showAddTimeOffDialog, setShowAddTimeOffDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const { toast } = useToast();

  // Function to format time in 12-hour format with AM/PM
  const formatTimeAMPM = (timeString: string) => {
    if (!timeString) return '';
    
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = minuteStr || '00';
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${displayHour}:${minute} ${period}`;
  };

  // Function to find shifts and time off for a specific day
  const getShiftsForDay = (day: Date) => {
    // Check for time off first (highest priority)
    const dayTimeOff = timeOffRequests.filter(timeOff => {
      const startDate = new Date(timeOff.start_date);
      const endDate = new Date(timeOff.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      const checkDay = new Date(day);
      checkDay.setHours(0, 0, 0, 0);
      
      return checkDay >= startDate && checkDay <= endDate && 
             (timeOff.status === 'approved' || timeOff.status === 'pending');
    });
    
    if (dayTimeOff.length > 0) {
      return dayTimeOff.map(timeOff => ({
        isTimeOff: true,
        reason: timeOff.reason || 'Time Off',
        status: timeOff.status,
        id: timeOff.id
      }));
    }
    
    // Check for specific shifts next (they override recurring shifts)
    const daySpecificShifts = specificShifts.filter(shift => {
      const startTime = new Date(shift.start_time);
      return isSameDay(startTime, day);
    });
    
    if (daySpecificShifts.length > 0) {
      return daySpecificShifts.map(shift => ({
        isTimeOff: false,
        startTime: format(new Date(shift.start_time), 'HH:mm'),
        endTime: format(new Date(shift.end_time), 'HH:mm'),
        id: shift.id,
        isSpecific: true,
        formattedStartTime: formatTimeAMPM(format(new Date(shift.start_time), 'HH:mm')),
        formattedEndTime: formatTimeAMPM(format(new Date(shift.end_time), 'HH:mm')),
        start_time: shift.start_time,
        end_time: shift.end_time
      }));
    }
    
    // Then check for recurring shifts
    const dayOfWeek = day.getDay();
    const dayRecurringShifts = recurringShifts.filter(shift => 
      shift.day_of_week === dayOfWeek
    );
    
    return dayRecurringShifts.map(shift => ({
      isTimeOff: false,
      startTime: shift.start_time,
      endTime: shift.end_time,
      id: shift.id,
      isRecurring: true,
      formattedStartTime: formatTimeAMPM(shift.start_time),
      formattedEndTime: formatTimeAMPM(shift.end_time)
    }));
  };

  // Initial letter for avatar
  const initials = employee.name
    .split(' ')
    .map((n: string) => n[0])
    .join('');

  const handleDialogClose = (shouldRefresh: boolean = false) => {
    setShowSetRegularShiftDialog(false);
    setShowAddSpecificShiftDialog(false);
    setShowAddTimeOffDialog(false);
    setSelectedDay(null);
    setSelectedShift(null);
    
    // If any changes were made, trigger the parent component to refresh the data
    if (shouldRefresh) {
      onDataChange();
    }
  };

  const handleDeleteAllShifts = async () => {
    try {
      // Delete all recurring shifts
      const { error: recurringError } = await supabase
        .from('recurring_shifts')
        .delete()
        .eq('employee_id', employee.id);
        
      if (recurringError) throw recurringError;
      
      // Delete all specific shifts
      const { error: specificError } = await supabase
        .from('shifts')
        .delete()
        .eq('employee_id', employee.id);
        
      if (specificError) throw specificError;
      
      toast({
        title: "Success",
        description: "All shifts have been deleted",
      });

      onDataChange();
    } catch (error) {
      console.error('Error deleting shifts:', error);
      toast({
        title: "Error",
        description: "Failed to delete shifts",
        variant: "destructive",
      });
    }
  };

  const handleCellClick = (day: Date, shifts: any[]) => {
    setSelectedDay(day);
    
    // If there are shifts, set the selectedShift to the first one
    if (shifts && shifts.length > 0) {
      setSelectedShift(shifts[0]);
    } else {
      setSelectedShift(null);
    }
    
    setShowAddSpecificShiftDialog(true);
  };

  return (
    <>
      <tr className="border-t">
        <td className="py-3 px-4 relative">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {employee.photo_url ? (
                <img src={employee.photo_url} alt={employee.name} />
              ) : (
                <AvatarFallback>{initials}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="font-medium">{employee.name}</p>
              <p className="text-xs text-gray-500">{employee.employment_type}</p>
            </div>
          </div>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Pencil className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48">
                <div className="flex flex-col space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => setShowSetRegularShiftDialog(true)}
                  >
                    Set regular shifts
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedDay(new Date());
                      setShowAddSpecificShiftDialog(true);
                    }}
                  >
                    Add specific shift
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => setShowAddTimeOffDialog(true)}
                  >
                    Add time off
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => window.location.href = `/admin/Staff?edit=${employee.id}`}
                  >
                    Edit team member
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-600"
                    onClick={handleDeleteAllShifts}
                  >
                    Delete all shifts
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </td>
        
        {weekDays.map((day) => {
          const shifts = getShiftsForDay(day);
          return (
            <td 
              key={day.toString()} 
              className="p-1 align-top border relative cursor-pointer"
              onMouseEnter={() => setHoveredDay(day as any)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Cell content (shifts, time off, or empty space) */}
              {shifts.length > 0 ? (
                <div className={`p-2 rounded text-center text-sm ${
                  shifts[0].isTimeOff 
                    ? shifts[0].status === 'approved' 
                      ? 'bg-red-100' 
                      : 'bg-yellow-100'
                    : 'bg-blue-100'
                }`}
                  onClick={() => handleCellClick(day, shifts)}
                >
                  {shifts.map((shift, idx) => (
                    <div key={`${shift.id}-${idx}`}>
                      {shift.isTimeOff ? (
                        <>
                          <span className={`font-medium ${
                            shift.status === 'approved' ? 'text-red-700' : 'text-yellow-700'
                          }`}>
                            {shift.reason}
                          </span>
                          <span className="text-xs block">
                            ({shift.status === 'approved' ? 'Approved' : 'Pending'})
                          </span>
                        </>
                      ) : (
                        `${shift.formattedStartTime} - ${shift.formattedEndTime}`
                      )}
                      {!shift.isTimeOff && shift.isSpecific && (
                        <span className="text-xs block text-blue-700">(Specific)</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-12" onClick={() => handleCellClick(day, [])} />
              )}
              
              {/* Centered plus button that appears when this day is hovered */}
              {hoveredDay === day && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white shadow-sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48" side="bottom">
                      <div className="flex flex-col space-y-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            setSelectedDay(day);
                            const dayShifts = getShiftsForDay(day);
                            setSelectedShift(dayShifts.length > 0 ? dayShifts[0] : null);
                            setShowAddSpecificShiftDialog(true);
                          }}
                        >
                          {shifts.length > 0 && !shifts[0].isTimeOff ? "Edit specific shift" : "Add specific shift"}
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => setShowSetRegularShiftDialog(true)}
                        >
                          Set regular shifts
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            setSelectedDay(day);
                            setShowAddTimeOffDialog(true);
                          }}
                        >
                          Add time off
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </td>
          );
        })}
      </tr>

      {showSetRegularShiftDialog && (
        <SetRegularShiftsDialog
          isOpen={showSetRegularShiftDialog}
          onClose={(saved) => handleDialogClose(saved)}
          employee={employee}
          onSave={() => handleDialogClose(true)}
          locationId={selectedLocation}
        />
      )}

      {showAddSpecificShiftDialog && (
        <AddShiftDialog
          isOpen={showAddSpecificShiftDialog}
          onClose={(saved) => handleDialogClose(saved)}
          selectedDate={selectedDay || new Date()}
          selectedEmployee={employee}
          employees={[employee]}
          selectedLocation={selectedLocation}
          existingShift={selectedShift && !selectedShift.isTimeOff ? selectedShift : null}
        />
      )}

      {showAddTimeOffDialog && (
        <AddTimeOffDialog
          isOpen={showAddTimeOffDialog}
          onClose={(saved) => handleDialogClose(saved)}
          selectedEmployee={employee}
          employees={[employee]}
          selectedLocation={selectedLocation}
        />
      )}
    </>
  );
}
