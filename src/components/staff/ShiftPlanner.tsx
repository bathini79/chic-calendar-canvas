import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { ShiftDialog } from "./ShiftDialog";
import { RegularShiftDialog } from "./RegularShiftDialog";

export function ShiftPlanner() {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [regularShiftDialogOpen, setRegularShiftDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*');
      
      if (error) throw error;
      return data;
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

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {employees?.map((employee) => (
          <WeeklyCalendar
            key={employee.id}
            employee={employee}
            shifts={shifts?.filter((s) => s.employee_id === employee.id) || []}
            onDateClick={(date) => handleDateClick(date, employee)}
            onSetRegularShifts={handleSetRegularShifts}
          />
        ))}
      </div>

      <ShiftDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        initialData={selectedDate ? {
          employee_id: selectedEmployee?.id,
          start_time: selectedDate.toISOString(),
          end_time: selectedDate.toISOString(),
        } : undefined}
      />

      <RegularShiftDialog
        open={regularShiftDialogOpen}
        onOpenChange={setRegularShiftDialogOpen}
        employee={selectedEmployee}
      />
    </div>
  );
}