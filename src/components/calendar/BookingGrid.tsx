import { BookingBlock } from "@/components/BookingBlock";
import { EmployeeRow } from "@/components/EmployeeRow";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  viewMode: 'grid' | 'list';
}

export function BookingGrid({ employees, bookings, timeSlots, viewMode }: BookingGridProps) {
  const [expandedTimeSlots, setExpandedTimeSlots] = useState<Record<string, boolean>>({});

  const toggleTimeSlot = (time: string) => {
    setExpandedTimeSlots(prev => ({
      ...prev,
      [time]: !prev[time]
    }));
  };

  if (viewMode === 'list') {
    const bookingsByTime = bookings.reduce((acc, booking) => {
      const time = booking.time;
      if (!acc[time]) {
        acc[time] = [];
      }
      acc[time].push(booking);
      return acc;
    }, {} as Record<string, Booking[]>);

    return (
      <div className="space-y-2 border rounded-lg p-4">
        {Object.entries(bookingsByTime).map(([time, timeBookings]) => (
          <div key={time} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 bg-muted hover:bg-muted/80 transition-colors"
              onClick={() => toggleTimeSlot(time)}
            >
              <span className="font-medium">{time}</span>
              {expandedTimeSlots[time] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {expandedTimeSlots[time] && (
              <div className="p-3 space-y-2">
                {timeBookings.map(booking => {
                  const employee = employees.find(emp => emp.id === booking.employeeId);
                  return (
                    <div key={booking.id} className="flex items-center gap-4 p-2 border rounded-lg">
                      <EmployeeRow name={employee?.name || ''} />
                      <div className={cn(
                        "flex-1 p-2 rounded-md",
                        {
                          "bg-green-50": booking.status === "confirmed",
                          "bg-orange-50": booking.status === "pending",
                          "bg-red-50": booking.status === "canceled"
                        }
                      )}>
                        <p className="font-medium">{booking.customer}</p>
                        <p className="text-sm text-muted-foreground">{booking.service}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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