
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
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';

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
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [selectedTimeOff, setSelectedTimeOff] = useState<any>(null);
  
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
        status: timeOff.status || 'pending',
        id: timeOff.id,
        start_date: timeOff.start_date,
        end_date: timeOff.end_date
      }));
    }
    
    // Check for specific shifts next (they override recurring shifts)
    const daySpecificShifts = specificShifts.filter(shift => {
      const startTime = new Date(shift.start_time);
      return isSameDay(startTime, day);
    });
    
    if (daySpecificShifts.length > 0) {
      return daySpecificShifts.map(shift => ({
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
    setSelectedTimeOff(null);
    
    // If any changes were made, trigger the parent component to refresh the data
    if (shouldRefresh) {
      onDataChange();
    }
  };
  
  const handleEditShift = (day: Date, shift: any) => {
    setSelectedDay(day);
    setSelectedShift(shift);
    
    if (shift.isTimeOff) {
      setSelectedTimeOff(shift);
      setShowAddTimeOffDialog(true);
    } else {
      setShowAddSpecificShiftDialog(true);
    }
  };
  
  const handleDeleteShift = async () => {
    try {
      if (selectedTimeOff) {
        // Delete time off request
        const { error } = await supabase
          .from('time_off_requests')
          .delete()
          .eq('id', selectedTimeOff.id);
          
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Time off request has been deleted",
        });
      } else if (selectedShift) {
        if (selectedShift.isSpecific) {
          // Delete specific shift
          const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('id', selectedShift.id);
            
          if (error) throw error;
          
          toast({
            title: "Success",
            description: "Shift has been deleted",
          });
        } else if (selectedShift.isRecurring) {
          // For recurring shifts, create an override (specific shift) for this day
          toast({
            title: "Info",
            description: "To delete a recurring shift pattern, use the 'Set regular shifts' option",
          });
          return;
        }
      }
      
      setConfirmDeleteDialogOpen(false);
      onDataChange();
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
                    onClick={() => setConfirmDeleteDialogOpen(true)}
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
                      {shift.isSpecific && !shift.isTimeOff && (
                        <span className="text-xs block text-blue-700">(Specific)</span>
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
                        {shifts.length > 0 ? (
                          <>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => handleEditShift(day, shifts[0])}
                            >
                              Edit shift
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-red-500"
                              onClick={() => {
                                setSelectedDay(day);
                                setSelectedShift(shifts[0]);
                                setSelectedTimeOff(shifts[0].isTimeOff ? shifts[0] : null);
                                setConfirmDeleteDialogOpen(true);
                              }}
                            >
                              Delete shift
                            </Button>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
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
          existingShift={selectedShift && !selectedShift.isTimeOff ? {
            startHour: selectedShift.startTime ? selectedShift.startTime.split(':')[0] : '09',
            startMinute: selectedShift.startTime ? selectedShift.startTime.split(':')[1] : '00',
            endHour: selectedShift.endTime ? selectedShift.endTime.split(':')[0] : '17',
            endMinute: selectedShift.endTime ? selectedShift.endTime.split(':')[1] : '00',
          } : undefined}
        />
      )}

      {showAddTimeOffDialog && (
        <AddTimeOffDialog
          isOpen={showAddTimeOffDialog}
          onClose={(saved) => handleDialogClose(saved)}
          selectedEmployee={employee}
          employees={[employee]}
          selectedLocation={selectedLocation}
          existingTimeOff={selectedTimeOff ? {
            start_date: selectedTimeOff.start_date,
            end_date: selectedTimeOff.end_date,
            reason: selectedTimeOff.reason,
            id: selectedTimeOff.id
          } : undefined}
        />
      )}
      
      <Dialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this {selectedTimeOff ? 'time off request' : 'shift'}?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteShift}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
