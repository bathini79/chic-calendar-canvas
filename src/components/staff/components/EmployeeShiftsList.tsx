import { WeeklyCalendar } from "../WeeklyCalendar";

interface EmployeeShiftsListProps {
  employees: any[];
  allShifts: any[];
  onDateClick: (date: Date, employee: any) => void;
  onSetRegularShifts: (employee: any) => void;
  currentWeek: Date;
}

export function EmployeeShiftsList({
  employees,
  allShifts,
  onDateClick,
  onSetRegularShifts,
  currentWeek
}: EmployeeShiftsListProps) {
  return (
    <div className="divide-y">
      {employees?.map((employee) => (
        <div key={employee.id} className="p-4">
          <WeeklyCalendar
            employee={employee}
            shifts={allShifts?.filter((s) => s.employee_id === employee.id) || []}
            onDateClick={(date) => onDateClick(date, employee)}
            onSetRegularShifts={onSetRegularShifts}
            currentWeek={currentWeek}
          />
        </div>
      ))}
    </div>
  );
}