
import React from 'react';
import { format, isSameDay } from 'date-fns';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SetRegularShiftsDialog } from './dialogs/SetRegularShiftsDialog';
import { AddShiftDialog } from './dialogs/AddShiftDialog';
import { AddTimeOffDialog } from './dialogs/AddTimeOffDialog';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [showDeleteShiftConfirm, setShowDeleteShiftConfirm] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<any>(null);
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
             timeOff.employee_id === employee.id && 
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
      return isSameDay(startTime, day) && shift.employee_id === employee.id;
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
      shift.day_of_week === dayOfWeek && shift.employee_id === employee.id
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
    
    // If any changes were made, trigger the parent component to refresh the data
    if (shouldRefresh) {
      onDataChange();
    }
  };

  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;
    
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftToDelete.id);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Shift has been deleted",
      });
      
      onDataChange();
      setShowDeleteShiftConfirm(false);
      setShiftToDelete(null);
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast({
        title: "Error",
        description: "Failed to delete shift",
        variant: "destructive",
      });
    }
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
                    className="w-full justify-start text-red-500"
                    onClick={() => {
                      setShowDeleteShiftConfirm(true);
                    }}
                  >
                    Delete shifts
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
                }`}>
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
                      {!shift.isTimeOff && (
                        <span className="text-xs block text-blue-700">
                          {shift.isSpecific ? "(Specific)" : "(Regular)"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-12" />
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
                        {shifts.length > 0 && !shifts[0].isTimeOff && shifts[0].isSpecific ? (
                          <>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => {
                                const shiftData = {
                                  id: shifts[0].id,
                                  start_time: shifts[0].start_time,
                                  end_time: shifts[0].end_time,
                                  employee_id: employee.id
                                };
                                setSelectedDay(day);
                                setShowAddSpecificShiftDialog(true);
                                setShiftToDelete(shiftData);
                              }}
                            >
                              Edit specific shift
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-red-500"
                              onClick={() => {
                                setShiftToDelete({
                                  id: shifts[0].id
                                });
                                setShowDeleteShiftConfirm(true);
                              }}
                            >
                              Delete specific shift
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedDay(day);
                              setShowAddSpecificShiftDialog(true);
                            }}
                          >
                            Add specific shift
                          </Button>
                        )}
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
          shiftToEdit={shiftToDelete}
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

      {/* Confirmation dialog for deleting shifts */}
      {showDeleteShiftConfirm && (
        <Dialog open={showDeleteShiftConfirm} onOpenChange={setShowDeleteShiftConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm deletion</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete {shiftToDelete ? 'this shift' : 'all shifts'} for {employee.name}?</p>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => {
                setShowDeleteShiftConfirm(false);
                setShiftToDelete(null);
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteShift}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
