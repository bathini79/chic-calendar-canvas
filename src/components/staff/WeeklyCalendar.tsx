import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { EmployeeRow } from "../EmployeeRow";
import { Button } from "../ui/button";
import { MoreHorizontal, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WeeklyCalendarProps {
  employee: any;
  shifts: any[];
  onDateClick: (date: Date) => void;
  onSetRegularShifts: (employee: any) => void;
  currentWeek: Date;
}

export function WeeklyCalendar({ 
  employee, 
  shifts, 
  onDateClick,
  onSetRegularShifts,
  currentWeek
}: WeeklyCalendarProps) {
  const queryClient = useQueryClient();
  const startDate = startOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const getShiftsForDate = (date: Date) => {
    return shifts.filter((shift) => 
      isSameDay(new Date(shift.start_time), date)
    );
  };

  const formatShiftTime = (start: string, end: string) => {
    return `${format(new Date(start), 'h:mma')} - ${format(new Date(end), 'h:mma')}`.toLowerCase();
  };

  const handleDeleteAllShifts = async () => {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('employee_id', employee.id);

      if (error) throw error;
      
      toast.success("All shifts deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);

      if (error) throw error;
      
      toast.success("Shift deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    } catch (error: any) {
      toast.error(error.message);
    }
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
              Set regular shifts
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={handleDeleteAllShifts}
            >
              Delete all shifts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date) => {
          const dayShifts = getShiftsForDate(date);
          const totalHours = dayShifts.reduce((acc, shift) => {
            const start = new Date(shift.start_time);
            const end = new Date(shift.end_time);
            return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          }, 0);
          
          return (
            <div
              key={date.toString()}
              className="min-h-[80px] p-2 border rounded-lg bg-accent/5 relative group"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{format(date, 'EEE, d MMM')}</span>
                {totalHours > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round(totalHours)}h
                  </span>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                onClick={() => onDateClick(date)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              
              {dayShifts.length > 0 ? (
                <div className="space-y-1 pt-2">
                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="text-xs p-1.5 rounded bg-accent/10 text-accent-foreground group/shift relative"
                    >
                      {formatShiftTime(shift.start_time, shift.end_time)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-1 -top-1 h-4 w-4 opacity-0 group-hover/shift:opacity-100 transition-opacity"
                        onClick={() => handleDeleteShift(shift.id)}
                      >
                        <span className="text-xs text-destructive">×</span>
                      </Button>
                    </div>
                  ))}
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
    </div>
  );
}