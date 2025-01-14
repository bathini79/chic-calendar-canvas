import { BookingBlock } from "@/components/BookingBlock";

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
  timeSlots: string[];
  bookings: Booking[];
  interval: number;
}

export function BookingGrid({ timeSlots, bookings, interval }: BookingGridProps) {
  return (
    <div className="calendar-grid border rounded-lg overflow-x-auto">
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
        <div className="relative" style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${timeSlots.length}, minmax(100px, 1fr))`,
          height: '4rem'
        }}>
          {timeSlots.map((_, i) => (
            <div key={i} className="time-slot" />
          ))}
          {bookings.map((booking) => (
            <BookingBlock 
              key={booking.id} 
              {...booking} 
              startPosition={booking.startPosition * (interval / 15)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}