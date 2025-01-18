import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { ShiftDialog } from "./ShiftDialog";
import { format, startOfWeek, addDays } from "date-fns";

export function ShiftPlanner() {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const startDate = startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[250px_1fr] gap-4 mb-4">
        <div className="font-medium">Team Member</div>
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((date) => (
            <div
              key={date.toString()}
              className="text-center font-medium p-2"
            >
              {format(date, 'EEE, d MMM')}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {employees?.map((employee) => (
          <WeeklyCalendar
            key={employee.id}
            employee={employee}
            shifts={shifts?.filter((s) => s.employee_id === employee.id) || []}
            onDateClick={(date) => {
              setSelectedDate(date);
              setSelectedEmployee(employee);
              setShiftDialogOpen(true);
            }}
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
    </div>
  );
}