import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployeeRow } from "@/components/EmployeeRow";
import { useState } from "react";

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

interface BookingListProps {
  employees: Employee[];
  bookings: Booking[];
}

export function BookingList({ employees, bookings }: BookingListProps) {
  const [expandedTimeSlots, setExpandedTimeSlots] = useState<Record<string, boolean>>({});

  const toggleTimeSlot = (time: string) => {
    setExpandedTimeSlots(prev => ({
      ...prev,
      [time]: !prev[time]
    }));
  };

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
                    <EmployeeRow name={employee?.name || ''} image={employee?.image} />
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