import { useState, useEffect } from "react";
import { MetricsDashboard } from "@/components/dashboard/MetricsDashboard";
import { CalendarControls } from "@/components/calendar/CalendarControls";
import { BookingGrid } from "@/components/calendar/BookingGrid";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useNavigate } from "react-router-dom";

const MOCK_EMPLOYEES = [
  { 
    id: 1, 
    name: "Alex Johnson",
    image: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952"
  },
  { 
    id: 2, 
    name: "Sarah Smith",
    image: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7"
  },
  { 
    id: 3, 
    name: "Michael Brown",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158"
  },
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
  const [interval, setInterval] = useState(15);
  const [date, setDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const timeSlots = generateTimeSlots(interval);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-full flex-col px-4 py-6">
            <div className="flex items-center gap-4 mb-6">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold">Bookings</h1>
            </div>
            <div className="flex-1 space-y-6 overflow-auto">
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
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;