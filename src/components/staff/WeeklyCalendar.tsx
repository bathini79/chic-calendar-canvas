import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { EmployeeRow } from "../EmployeeRow";
import { Button } from "../ui/button";
import { Pencil } from "lucide-react";

interface WeeklyCalendarProps {
  employee: any;
  shifts: any[];
  onDateClick: (date: Date) => void;
}

export function WeeklyCalendar({ employee, shifts, onDateClick }: WeeklyCalendarProps) {
  const startDate = startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const getShiftsForDate = (date: Date) => {
    return shifts.filter((shift) => 
      isSameDay(new Date(shift.start_time), date)
    );
  };

  const formatShiftTime = (start: string, end: string) => {
    return `${format(new Date(start), 'ha')} - ${format(new Date(end), 'ha')}`;
  };

  return (
    <div className="grid grid-cols-[250px_1fr] gap-4">
      <div className="flex items-center">
        <EmployeeRow name={employee.name} image={employee.photo_url} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateClick(new Date())}
          className="ml-2"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date) => {
          const dayShifts = getShiftsForDate(date);
          
          return (
            <button
              key={date.toString()}
              onClick={() => onDateClick(date)}
              className="min-h-[80px] p-2 text-left border rounded-lg hover:bg-accent transition-colors"
            >
              {dayShifts.length > 0 ? (
                <div className="space-y-1">
                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="text-xs p-1 rounded bg-blue-100 text-blue-800"
                    >
                      {formatShiftTime(shift.start_time, shift.end_time)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No shifts
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}