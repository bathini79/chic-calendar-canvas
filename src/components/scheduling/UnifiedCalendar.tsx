import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarControls } from "@/components/calendar/CalendarControls";
import { format, addMinutes, isSameDay, isWithinInterval } from "date-fns";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface SelectedService {
  serviceId: string;
  employeeId: string | 'any';
  startTime?: Date;
}

interface UnifiedCalendarProps {
  selectedServices: SelectedService[];
  onTimeSelect: (serviceId: string, startTime: Date) => void;
}

export function UnifiedCalendar({ selectedServices, onTimeSelect }: UnifiedCalendarProps) {
  const [date, setDate] = useState(new Date());
  const [interval] = useState(30);
  const [viewMode] = useState<'grid' | 'list'>('grid');

  // Fetch existing bookings
  const { data: existingBookings } = useQuery({
    queryKey: ['bookings', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', format(date, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch location hours
  const { data: locationHours } = useQuery({
    queryKey: ['location-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_hours')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const generateTimeSlots = () => {
    if (!locationHours) return [];
    
    const slots: Date[] = [];
    const startTime = new Date(date);
    startTime.setHours(9, 0, 0, 0); // Assuming 9 AM start
    
    const endTime = new Date(date);
    endTime.setHours(17, 0, 0, 0); // Assuming 5 PM end
    
    let currentTime = startTime;
    while (currentTime < endTime) {
      slots.push(new Date(currentTime));
      currentTime = addMinutes(currentTime, interval);
    }
    
    return slots;
  };

  const isSlotAvailable = (slot: Date, serviceId: string, employeeId: string | 'any') => {
    if (!existingBookings) return true;

    // Check if slot conflicts with existing bookings
    return !existingBookings.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      if (!isSameDay(slot, bookingStart)) return false;

      return isWithinInterval(slot, { start: bookingStart, end: bookingEnd }) ||
             isWithinInterval(addMinutes(slot, interval), { start: bookingStart, end: bookingEnd });
    });
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Select Time Slots</h2>
      
      <CalendarControls
        date={date}
        setDate={setDate}
        interval={interval}
        setInterval={() => {}}
        viewMode={viewMode}
        setViewMode={() => {}}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedServices.map((service) => (
          <div key={service.serviceId} className="space-y-2">
            <h3 className="font-medium">{service.serviceId}</h3>
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.map((slot) => {
                const isAvailable = isSlotAvailable(slot, service.serviceId, service.employeeId);
                const isSelected = service.startTime && 
                  format(service.startTime, 'HH:mm') === format(slot, 'HH:mm');

                return (
                  <HoverCard key={slot.toISOString()}>
                    <HoverCardTrigger asChild>
                      <button
                        className={`
                          p-2 rounded-md text-sm
                          ${isSelected ? 'bg-primary text-primary-foreground' : 
                            isAvailable ? 'bg-secondary hover:bg-secondary/80' : 'bg-muted cursor-not-allowed'}
                        `}
                        onClick={() => isAvailable && onTimeSelect(service.serviceId, slot)}
                        disabled={!isAvailable}
                      >
                        {format(slot, 'h:mm a')}
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      {isAvailable ? (
                        <p>Available slot</p>
                      ) : (
                        <p>This time slot is not available</p>
                      )}
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}