import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShiftDialog } from "./ShiftDialog";
import { RegularShiftDialog } from "./RegularShiftDialog";
import { addWeeks, subWeeks, startOfWeek, endOfWeek, addDays, isSameDay, format } from "date-fns";
import { toast } from "sonner";
import { ShiftPlannerHeader } from "./components/ShiftPlannerHeader";
import { EmployeeShiftsList } from "./components/EmployeeShiftsList";

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

  // Query for shifts and recurring patterns within the current week
  const { data: allShifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', format(currentWeek, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekStart = startOfWeek(currentWeek);
      const weekEnd = endOfWeek(currentWeek);
      
      // Get regular shifts and overrides
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
              is_pattern_generated: true,
              pattern_id: pattern.id
            });
          }
          currentDate = addDays(currentDate, 1);
        }
        return shiftsForWeek;
      }) || [];

      // Combine regular and generated shifts
      return [...(regularShifts || []), ...generatedShifts];
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

  if (employeesLoading || shiftsLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ShiftPlannerHeader
        currentWeek={currentWeek}
        onWeekChange={handleWeekChange}
      />

      <div className="bg-card rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground">Staff Schedule</h3>
        </div>
        <EmployeeShiftsList
          employees={employees}
          allShifts={allShifts}
          onDateClick={handleDateClick}
          onSetRegularShifts={handleSetRegularShifts}
          currentWeek={currentWeek}
        />
      </div>

      <ShiftDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        employee={selectedEmployee}
        selectedDate={selectedDate}
        existingShifts={selectedDate && selectedEmployee ? 
          allShifts?.filter(s => 
            s.employee_id === selectedEmployee.id && 
            isSameDay(new Date(s.start_time), selectedDate)
          ) : []
        }
      />

      <RegularShiftDialog
        open={regularShiftDialogOpen}
        onOpenChange={setRegularShiftDialogOpen}
        employee={selectedEmployee}
      />
    </div>
  );
}