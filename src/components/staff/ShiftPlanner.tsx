import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { ShiftDialog } from "./ShiftDialog";
import { RegularShiftDialog } from "./RegularShiftDialog";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";

export function ShiftPlanner() {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [regularShiftDialogOpen, setRegularShiftDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Query for active employees
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (error) {
        toast.error("Failed to load employees");
        throw error;
      }
      return data;
    },
  });

  // Query for shifts within the current week
  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', format(currentWeek, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekStart = startOfWeek(currentWeek);
      const weekEnd = endOfWeek(currentWeek);
      
      // Get regular shifts
      const { data: regularShifts, error: regularError } = await supabase
        .from('shifts')
        .select('*')
        .gte('start_time', weekStart.toISOString())
        .lte('end_time', weekEnd.toISOString());
      
      if (regularError) throw regularError;

      // Get recurring shift patterns
      const { data: patterns, error: patternsError } = await supabase
        .from('recurring_shifts')
        .select('*')
        .lte('effective_from', weekEnd.toISOString())
        .or(`effective_until.is.null,effective_until.gte.${weekStart.toISOString()}`);

      if (patternsError) throw patternsError;

      // Generate shifts from patterns
      const generatedShifts = patterns?.flatMap(pattern => {
        const shiftsForWeek = [];
        let currentDate = new Date(weekStart);

        while (currentDate <= weekEnd) {
          if (currentDate.getDay() === pattern.day_of_week) {
            const shiftStart = new Date(currentDate);
            const [startHour, startMinute] = pattern.start_time.split(':');
            shiftStart.setHours(parseInt(startHour), parseInt(startMinute), 0);

            const shiftEnd = new Date(currentDate);
            const [endHour, endMinute] = pattern.end_time.split(':');
            shiftEnd.setHours(parseInt(endHour), parseInt(endMinute), 0);

            shiftsForWeek.push({
              ...pattern,
              id: `pattern-${pattern.id}-${format(currentDate, 'yyyy-MM-dd')}`,
              start_time: shiftStart.toISOString(),
              end_time: shiftEnd.toISOString(),
              is_recurring: true
            });
          }
          currentDate = addDays(currentDate, 1);
        }
        return shiftsForWeek;
      }) || [];

      // Combine regular and generated shifts
      return [...regularShifts, ...generatedShifts];
    },
  });

  const handleDateClick = (date: Date, employee: any) => {
    setSelectedDate(date);
    setSelectedEmployee(employee);
    setShiftDialogOpen(true);
  };

  const handleSetRegularShifts = (employee: any) => {
    setSelectedEmployee(employee);
    setRegularShiftDialogOpen(true);
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => 
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
  };

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);

  if (employeesLoading || shiftsLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Shift Planner
        </h2>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleWeekChange('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm font-medium bg-accent/10 px-4 py-2 rounded-md flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {format(weekStart, "d MMM")} - {format(weekEnd, "d MMM, yyyy")}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleWeekChange('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground">Staff Schedule</h3>
        </div>
        <div className="divide-y">
          {employees?.map((employee) => (
            <div key={employee.id} className="p-4">
              <WeeklyCalendar
                employee={employee}
                shifts={shifts?.filter((s) => s.employee_id === employee.id) || []}
                onDateClick={(date) => handleDateClick(date, employee)}
                onSetRegularShifts={handleSetRegularShifts}
                currentWeek={currentWeek}
              />
            </div>
          ))}
        </div>
      </div>

      <ShiftDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        initialData={selectedDate ? {
          employee_id: selectedEmployee?.id,
          start_time: selectedDate.toISOString(),
          end_time: selectedDate.toISOString(),
        } : undefined}
        employee={selectedEmployee}
      />

      <RegularShiftDialog
        open={regularShiftDialogOpen}
        onOpenChange={setRegularShiftDialogOpen}
        employee={selectedEmployee}
      />
    </div>
  );
}
