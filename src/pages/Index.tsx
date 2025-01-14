import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { BookingBlock } from "@/components/BookingBlock";
import { EmployeeRow } from "@/components/EmployeeRow";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, IndianRupee, Gift, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format, addDays, subDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MOCK_EMPLOYEES = [
  { id: 1, name: "Alex Johnson" },
  { id: 2, name: "Sarah Smith" },
  { id: 3, name: "Michael Brown" },
];

const MOCK_BOOKINGS = [
  { 
    id: 1, 
    employeeId: 1,
    customer: "John Doe",
    service: "Haircut",
    time: "10:00 AM",
    duration: 2,
    status: "confirmed" as const,
    startPosition: 4
  },
  {
    id: 2,
    employeeId: 2,
    customer: "Jane Smith",
    service: "Color",
    time: "11:30 AM",
    duration: 3,
    status: "pending" as const,
    startPosition: 10
  },
];

const generateTimeSlots = (interval: number) => {
  const slots = [];
  const totalSlots = (12 * 60) / interval; // 12 hours from 9 AM to 9 PM
  
  for (let i = 0; i < totalSlots; i++) {
    const minutes = i * interval;
    const hour = Math.floor(minutes / 60) + 9; // Starting from 9 AM
    const minute = minutes % 60;
    slots.push(
      `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    );
  }
  return slots;
};

const Index = () => {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [interval, setInterval] = useState(15);
  const [date, setDate] = useState<Date>(new Date());

  const timeSlots = generateTimeSlots(interval);
  const filteredBookings = selectedEmployee 
    ? MOCK_BOOKINGS.filter(b => b.employeeId === selectedEmployee)
    : MOCK_BOOKINGS;

  const handlePreviousDay = () => setDate(prev => subDays(prev, 1));
  const handleNextDay = () => setDate(prev => addDays(prev, 1));
  const handleToday = () => setDate(new Date());

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Metrics Section */}
      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard
          title="Pending Confirmations"
          value="5"
          icon={<CalendarIcon className="h-4 w-4" />}
        />
        <MetricCard
          title="Upcoming Bookings"
          value="12"
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          title="Today's Bookings"
          value="8"
          icon={<UserCheck className="h-4 w-4" />}
        />
        <MetricCard
          title="Today's Revenue"
          value="₹8,500"
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <MetricCard
          title="Upcoming Birthdays"
          value="3"
          icon={<Gift className="h-4 w-4" />}
        />
      </div>

      {/* Calendar Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
            All Employees
          </Button>
          {MOCK_EMPLOYEES.map((emp) => (
            <Button
              key={emp.id}
              variant={selectedEmployee === emp.id ? "default" : "outline"}
              onClick={() => setSelectedEmployee(emp.id)}
            >
              {emp.name}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[240px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleToday}>
              Today
            </Button>
          </div>
          <Select
            value={interval.toString()}
            onValueChange={(value) => setInterval(Number(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => {
              toast({
                title: "Coming Soon",
                description: "New booking functionality will be added in the next update.",
              });
            }}
          >
            + New Booking
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid border rounded-lg overflow-x-auto">
        {/* Employee Column */}
        <div className="border-r">
          <div className="h-16 border-b bg-muted" /> {/* Header spacer */}
          {MOCK_EMPLOYEES.map((emp) => (
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
          {MOCK_EMPLOYEES.map((emp) => (
            <div key={emp.id} className="relative" style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${timeSlots.length}, minmax(100px, 1fr))`,
              height: '4rem'
            }}>
              {timeSlots.map((_, i) => (
                <div key={i} className="time-slot" />
              ))}
              {filteredBookings
                .filter((b) => b.employeeId === emp.id)
                .map((booking) => (
                  <BookingBlock 
                    key={booking.id} 
                    {...booking} 
                    startPosition={booking.startPosition * (interval / 15)}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;