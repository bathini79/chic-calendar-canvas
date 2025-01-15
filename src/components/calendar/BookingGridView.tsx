import { EmployeeRow } from "@/components/EmployeeRow";
import { BookingBlock } from "@/components/BookingBlock";
import { GridHeader } from "./GridHeader";

interface Employee {
  id: number;
  name: string;
  image?: string;
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

interface BookingGridViewProps {
  employees: Employee[];
  bookings: Booking[];
  timeSlots: string[];
}

export function BookingGridView({ employees, bookings, timeSlots }: BookingGridViewProps) {
  return (
    <div className="calendar-grid border rounded-lg overflow-x-auto">
      {/* Employee Column */}
      <div className="border-r">
        <div className="h-16 border-b bg-muted" /> {/* Header spacer */}
        {employees.map((emp) => (
          <EmployeeRow key={emp.id} name={emp.name} image={emp.image} />
        ))}
      </div>

      {/* Time Slots */}
      <div className="min-w-[800px]">
        <GridHeader timeSlots={timeSlots} />

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