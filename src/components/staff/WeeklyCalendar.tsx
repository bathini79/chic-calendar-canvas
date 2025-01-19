import { useState } from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { EmployeeRow } from "../EmployeeRow";
import { Button } from "../ui/button";
import { MoreHorizontal, Plus, Clock, CalendarCheck, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ShiftDialog } from "./ShiftDialog";

interface WeeklyCalendarProps {
  employee: any;
  shifts: any[];
  onDateClick: (date: Date) => void;
  onSetRegularShifts: (employee: any) => void;
  currentWeek: Date;
}

export function WeeklyCalendar({ 
  employee, 
  shifts = [],
  onDateClick,
  onSetRegularShifts,
  currentWeek
}: WeeklyCalendarProps) {
  const queryClient = useQueryClient();
  const startDate = startOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);

  const getShiftsForDate = (date: Date) => {
    // Get regular shifts for this date
    const regularShifts = shifts.filter(shift => 
      !shift.is_recurring && isSameDay(new Date(shift.start_time), date)
    );

    // Get recurring shifts that are not overridden
    const recurringShifts = shifts.filter(shift => 
      shift.is_recurring && 
      new Date(shift.start_time).getDay() === date.getDay() &&
      !shifts.some(override => 
        override.is_override && 
        isSameDay(new Date(override.start_time), date)
      )
    );

    // Get overrides for this date
    const overrides = shifts.filter(shift => 
      shift.is_override && isSameDay(new Date(shift.start_time), date)
    );

    return [...regularShifts, ...recurringShifts, ...overrides];
  };

  const formatShiftTime = (start: string | Date, end: string | Date) => {
    const startDate = typeof start === 'string' ? parseISO(start) : start;
    const endDate = typeof end === 'string' ? parseISO(end) : end;
    return `${format(startDate, 'h:mma')} - ${format(endDate, 'h:mma')}`.toLowerCase();
  };

  const calculateTotalHours = (shifts: any[]) => {
    return shifts.reduce((acc, shift) => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
  };

  const getShiftStatusColor = (status: string, isRecurring: boolean = false, isOverride: boolean = false) => {
    if (isOverride) {
      return 'bg-red-100 text-red-800';
    }
    if (isRecurring) {
      return 'bg-blue-100 text-blue-800';
    }
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-accent/10 text-accent-foreground';
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShiftDialogOpen(true);
  };

  return (
    <div className="grid grid-cols-[250px_1fr] gap-4">
      <div className="flex items-center justify-between pr-4">
        <EmployeeRow name={employee.name} image={employee.photo_url} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSetRegularShifts(employee)}>
              <CalendarCheck className="h-4 w-4 mr-2" />
              Set regular shifts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date) => {
          const dayShifts = getShiftsForDate(date);
          const totalHours = calculateTotalHours(dayShifts);
          
          return (
            <div
              key={date.toString()}
              className="min-h-[80px] p-2 border rounded-lg bg-accent/5 relative group"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{format(date, 'EEE, d MMM')}</span>
                {totalHours > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round(totalHours)}h
                  </Badge>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDayClick(date)}>
                    <Clock className="h-4 w-4 mr-2" />
                    Update shifts for this day
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {dayShifts.length > 0 ? (
                <div className="space-y-1 pt-2">
                  {dayShifts.map((shift) => {
                    const isRecurring = shift.is_recurring;
                    const isOverride = shift.is_override;
                    const shiftTime = formatShiftTime(shift.start_time, shift.end_time);

                    return (
                      <div
                        key={shift.id}
                        className={`text-xs p-1.5 rounded ${getShiftStatusColor(shift.status, isRecurring, isOverride)}`}
                      >
                        {shiftTime}
                        {isRecurring && !isOverride && (
                          <Badge variant="secondary" className="ml-1 text-[10px]">
                            Recurring
                          </Badge>
                        )}
                        {isOverride && (
                          <Badge variant="destructive" className="ml-1 text-[10px]">
                            Cancelled
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground pt-2">
                  No shifts
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ShiftDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        employee={employee}
        selectedDate={selectedDate}
        existingShifts={selectedDate ? getShiftsForDate(selectedDate) : []}
      />
    </div>
  );
}