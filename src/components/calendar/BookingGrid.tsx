import { BookingBlock } from "@/components/BookingBlock";
import { EmployeeRow } from "@/components/EmployeeRow";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {employees.map((emp) => (
          <div key={emp.id} className="border rounded-lg overflow-hidden">
            <div className="bg-muted p-4 font-medium border-b">
              {emp.name}
            </div>
            <div className="divide-y">
              {bookings
                .filter((b) => b.employeeId === emp.id)
                .map((booking) => (
                  <div key={booking.id} className="p-4">
                    <div className={cn(
                      "rounded-md p-3",
                      {
                        "bg-green-100 text-green-700": booking.status === "confirmed",
                        "bg-orange-100 text-orange-700": booking.status === "pending",
                        "bg-red-100 text-red-700": booking.status === "canceled"
                      }
                    )}>
                      <p className="font-medium">{booking.customer}</p>
                      <p className="text-sm">{booking.service}</p>
                      <p className="text-xs mt-1">{booking.time}</p>
                      <p className="text-xs capitalize">{booking.status}</p>
                    </div>
                  </div>
                ))}
              {bookings.filter((b) => b.employeeId === emp.id).length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">
                  No bookings scheduled
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

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