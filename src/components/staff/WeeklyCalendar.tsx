import { format, startOfWeek, addDays, isSameDay } from "date-fns";

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

  return (
    <div className="grid grid-cols-7 gap-4">
      {weekDays.map((date) => {
        const dayShifts = getShiftsForDate(date);
        
        return (
          <button
            key={date.toString()}
            onClick={() => onDateClick(date)}
            className="min-h-[80px] p-2 text-left border rounded-lg hover:bg-accent transition-colors"
          >
            <div className="text-sm font-medium mb-1">
              {format(date, 'd')}
            </div>
            {dayShifts.length > 0 ? (
              <div className="space-y-1">
                {dayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className={`text-xs p-1 rounded ${
                      shift.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : shift.status === 'declined'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {format(new Date(shift.start_time), 'HH:mm')} - 
                    {format(new Date(shift.end_time), 'HH:mm')}
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
  );
}