import { BookingBlock } from "@/components/BookingBlock";
import { EmployeeRow } from "@/components/EmployeeRow";

interface Employee {
  id: number;
  name: string;
}

interface Booking {
  id: number;
  employeeId: number;
  customer: string;
  service: string;
  time: string;
  duration: number;
  status: "confirmed" | "pending" | "canceled";
  startPosition: number;
}

interface BookingGridProps {
  employees: Employee[];
  bookings: Booking[];
  timeSlots: string[];
}

export function BookingGrid({ employees, bookings, timeSlots }: BookingGridProps) {
  return (
    <div className="calendar-grid border rounded-lg overflow-x-auto">
      {/* Employee Column */}
      <div className="border-r">
        <div className="h-16 border-b bg-muted" /> {/* Header spacer */}
        {employees.map((emp) => (
          <EmployeeRow key={emp.id} name={emp.name} />
        ))}
      </div>

      {/* Time Slots */}
      <div className="min-w-[800px]">
        {/* Time Headers */}
        <div className="grid h-16 border-b bg-muted" style={{
          gridTemplateColumns: `repeat(${timeSlots.length}, minmax(100px, 1fr))`
        }}>
          {timeSlots.map((time) => (
            <div key={time} className="flex items-center justify-center border-r text-sm">
              {time}
            </div>
          ))}
        </div>

        {/* Booking Grid */}
        {employees.map((emp) => (
          <div key={emp.id} className="relative" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${timeSlots.length}, minmax(100px, 1fr))`,
            height: '4rem'
          }}>
            {timeSlots.map((_, i) => (
              <div key={i} className="time-slot" />
            ))}
            {bookings
              .filter((b) => b.employeeId === emp.id)
              .map((booking) => (
                <BookingBlock 
                  key={booking.id} 
                  {...booking} 
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}