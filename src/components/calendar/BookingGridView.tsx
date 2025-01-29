import { EmployeeRow } from "@/components/EmployeeRow";
import { BookingBlock } from "@/components/BookingBlock";
import { GridHeader } from "./GridHeader";
import { Button } from "@/components/ui/button";

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
  const hasBookings = bookings.length > 0;

  return (
    <div className="border rounded-xl overflow-hidden bg-white p-6">
      {!hasBookings ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-xl font-semibold text-primary">H</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Fully booked on this date</h3>
          <p className="text-muted-foreground mb-6">Available from Mon, 17 Feb</p>
          <div className="flex gap-4">
            <Button variant="outline">Go to next available date</Button>
            <Button variant="outline">Join the waitlist</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="border-r">
            <div className="h-16 border-b bg-muted" />
            {employees.map((emp) => (
              <EmployeeRow key={emp.id} name={emp.name} image={emp.image} />
            ))}
          </div>

          <div className="min-w-[800px]">
            <GridHeader timeSlots={timeSlots} />
            {employees.map((emp) => (
              <div 
                key={emp.id} 
                className="relative"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${timeSlots.length}, minmax(100px, 1fr))`,
                  height: '4rem'
                }}
              >
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
        </>
      )}
    </div>
  );
}