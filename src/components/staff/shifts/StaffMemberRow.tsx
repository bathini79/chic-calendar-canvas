
import React from 'react';
import { format, isSameDay } from 'date-fns';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil } from 'lucide-react';
import { RegularShiftsActions } from './RegularShiftsActions';

interface StaffMemberRowProps {
  employee: any;
  weekDays: Date[];
  recurringShifts: any[];
  specificShifts: any[];
  onSetRegularShifts: () => void;
}

export function StaffMemberRow({
  employee,
  weekDays,
  recurringShifts,
  specificShifts,
  onSetRegularShifts
}: StaffMemberRowProps) {
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

  return (
    <tr className="border-t">
      <td className="py-3 px-4 relative group">
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
        <div className="hidden group-hover:block absolute right-2 top-1/2 transform -translate-y-1/2">
          <RegularShiftsActions employee={employee} onSetRegularShifts={onSetRegularShifts} />
        </div>
      </td>
      
      {weekDays.map((day) => {
        const shifts = getShiftsForDay(day);
        
        return (
          <td key={day.toString()} className="p-1 align-top border">
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
          </td>
        );
      })}
    </tr>
  );
}
