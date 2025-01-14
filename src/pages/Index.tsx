import { useState } from "react";
import { MetricsDashboard } from "@/components/dashboard/MetricsDashboard";
import { CalendarControls } from "@/components/calendar/CalendarControls";
import { BookingGrid } from "@/components/calendar/BookingGrid";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  const totalSlots = (12 * 60) / interval;
  
  for (let i = 0; i < totalSlots; i++) {
    const minutes = i * interval;
    const hour = Math.floor(minutes / 60) + 9;
    const minute = minutes % 60;
    slots.push(
      `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    );
  }
  return slots;
};

const Index = () => {
  const navigate = useNavigate();
  const [interval, setInterval] = useState(15);
  const [date, setDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const timeSlots = generateTimeSlots(interval);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="container mx-auto py-4 md:py-8 space-y-4 md:space-y-8 px-2 md:px-8">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
      <MetricsDashboard />
      <CalendarControls 
        date={date}
        setDate={setDate}
        interval={interval}
        setInterval={setInterval}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      <BookingGrid 
        employees={MOCK_EMPLOYEES}
        bookings={MOCK_BOOKINGS}
        timeSlots={timeSlots}
        viewMode={viewMode}
      />
    </div>
  );
};

export default Index;