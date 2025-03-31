
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
import { useIsMobile } from '@/hooks/use-mobile';

interface StaffMemberRowProps {
  employee: any;
  weekDays: Date[];
  recurringShifts: any[];
  specificShifts: any[];
}

export function StaffMemberRow({
  employee,
  weekDays,
  recurringShifts,
  specificShifts,
}: StaffMemberRowProps) {
  const [showSetRegularShiftDialog, setShowSetRegularShiftDialog] = useState(false);
  const [showAddSpecificShiftDialog, setShowAddSpecificShiftDialog] = useState(false);
  const [showAddTimeOffDialog, setShowAddTimeOffDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const isMobile = useIsMobile();
  
  // Function to find shifts for a specific day
  const getShiftsForDay = (day: Date) => {
    // Check for specific shifts first (they override recurring shifts)
    const daySpecificShifts = specificShifts.filter(shift => {
      const startTime = new Date(shift.start_time);
      return isSameDay(startTime, day);
    });
    
    if (daySpecificShifts.length > 0) {
      return daySpecificShifts.map(shift => ({
        startTime: format(new Date(shift.start_time), 'h:mma'),
        endTime: format(new Date(shift.end_time), 'h:mma'),
        id: shift.id,
        isSpecific: true
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
      isRecurring: true
    }));
  };

  // Initial letter for avatar
  const initials = employee.name
    .split(' ')
    .map((n: string) => n[0])
    .join('');

  const handleDialogClose = () => {
    setShowSetRegularShiftDialog(false);
    setShowAddSpecificShiftDialog(false);
    setShowAddTimeOffDialog(false);
    setSelectedDay(null);
  };

  // Mobile view rendering
  if (isMobile) {
    return (
      <>
        <div className="border-b">
          <div className="py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {employee.photo_url ? (
                  <img src={employee.photo_url} alt={employee.name} />
                ) : (
                  <AvatarFallback className="text-lg bg-primary/10">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="font-medium text-base">{employee.name}</p>
                <p className="text-sm text-muted-foreground">{employee.employment_type}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => {
                // Toggle expanded view would go here
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </Button>
          </div>
          
          {/* Daily shift entries */}
          {weekDays.map((day) => {
            const shifts = getShiftsForDay(day);
            return (
              <div key={day.toString()} className="border-t py-3 px-4 flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">{format(day, 'EEE, d MMM')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {shifts.length > 0 ? (
                    <div className="bg-blue-100 px-3 py-1 rounded-full text-sm">
                      {shifts[0].startTime} - {shifts[0].endTime}
                    </div>
                  ) : (
                    <div className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                      Not working
                    </div>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-neutral-100 border-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                          <line x1="8" x2="16" y1="12" y2="12"></line>
                          <line x1="12" x2="12" y1="8" y2="16"></line>
                        </svg>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48" side="top" align="end">
                      <div className="flex flex-col space-y-2">
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
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons for mobile */}
        <div className="fixed bottom-16 right-4 flex flex-col gap-2">
          <Button 
            className="h-12 w-12 rounded-full bg-gray-700 shadow-lg"
            onClick={() => window.location.href = `/admin/Staff?edit=${employee.id}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="m16.5 3.5 2 2L7 17H5v-2L16.5 3.5z"></path>
              <path d="m18.5 5.5-2-2L18 2l2 2-1.5 1.5z"></path>
            </svg>
          </Button>
          <Button 
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => {
              setSelectedDay(new Date());
              setShowAddTimeOffDialog(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
              <line x1="12" x2="12" y1="8" y2="16"></line>
              <line x1="8" x2="16" y1="12" y2="12"></line>
            </svg>
          </Button>
        </div>

        {showSetRegularShiftDialog && (
          <SetRegularShiftsDialog
            isOpen={showSetRegularShiftDialog}
            onClose={handleDialogClose}
            employee={employee}
            onSave={handleDialogClose}
          />
        )}

        {showAddSpecificShiftDialog && (
          <AddShiftDialog
            isOpen={showAddSpecificShiftDialog}
            onClose={handleDialogClose}
            selectedDate={selectedDay || new Date()}
            selectedEmployee={employee}
            employees={[employee]}
            locations={[]}
          />
        )}

        {showAddTimeOffDialog && (
          <AddTimeOffDialog
            isOpen={showAddTimeOffDialog}
            onClose={handleDialogClose}
            selectedEmployee={employee}
            employees={[employee]}
          />
        )}
      </>
    );
  }

  // Desktop view rendering
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
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Cell content (shifts or empty space) */}
              {shifts.length > 0 ? (
                <div className="bg-blue-100 p-2 rounded text-center text-sm">
                  {shifts.map((shift, idx) => (
                    <div key={`${shift.id}-${idx}`}>
                      {shift.startTime} - {shift.endTime}
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
          onClose={handleDialogClose}
          employee={employee}
          onSave={handleDialogClose}
        />
      )}

      {showAddSpecificShiftDialog && (
        <AddShiftDialog
          isOpen={showAddSpecificShiftDialog}
          onClose={handleDialogClose}
          selectedDate={selectedDay || new Date()}
          selectedEmployee={employee}
          employees={[employee]}
          locations={[]}
        />
      )}

      {showAddTimeOffDialog && (
        <AddTimeOffDialog
          isOpen={showAddTimeOffDialog}
          onClose={handleDialogClose}
          selectedEmployee={employee}
          employees={[employee]}
        />
      )}
    </>
  );
}
