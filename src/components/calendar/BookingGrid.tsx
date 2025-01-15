import { BookingGridView } from "./BookingGridView";
import { BookingList } from "./BookingList";

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

interface BookingGridProps {
  employees: Employee[];
  bookings: Booking[];
  timeSlots: string[];
  viewMode: 'grid' | 'list';
}

export function BookingGrid({ employees, bookings, timeSlots, viewMode }: BookingGridProps) {
  if (viewMode === 'list') {
    return <BookingList employees={employees} bookings={bookings} />;
  }

  return (
    <BookingGridView 
      employees={employees} 
      bookings={bookings} 
      timeSlots={timeSlots} 
    />
  );
}