import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { Button } from "@/components/ui/button";
import { ShiftDialog } from "./ShiftDialog";
import { TimeOffDialog } from "./TimeOffDialog";
import { format, startOfWeek, addDays } from "date-fns";

export function ShiftPlanner() {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false);
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
      <div className="grid grid-cols-[250px_1fr] gap-4">
        {/* Employee List Column */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Employees</h3>
          <div className="space-y-2">
            {employees?.map((employee) => (
              <div
                key={employee.id}
                className="p-3 bg-card rounded-lg border shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{employee.name}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShiftDialogOpen(true);
                      }}
                    >
                      Add Shift
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setTimeOffDialogOpen(true);
                      }}
                    >
                      Time Off
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Column */}
        <div>
          <div className="grid grid-cols-7 gap-4 mb-4">
            {weekDays.map((date) => (
              <div
                key={date.toString()}
                className="text-center font-medium p-2 bg-muted rounded-md"
              >
                {format(date, 'EEE')}
              </div>
            ))}
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
      />

      <TimeOffDialog
        open={timeOffDialogOpen}
        onOpenChange={setTimeOffDialogOpen}
        employeeId={selectedEmployee?.id}
      />
    </div>
  );
}