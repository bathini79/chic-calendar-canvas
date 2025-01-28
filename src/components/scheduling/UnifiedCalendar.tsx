import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMinutes } from "date-fns";
import { useCart } from "@/components/cart/CartContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ModernScheduler } from "./ModernScheduler";

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isSelected: boolean;
  endTime: string;
}

interface UnifiedCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  selectedTimeSlots: Record<string, string>;
  onTimeSlotSelect: (itemId: string, timeSlot: string) => void;
  selectedStylists: Record<string, string>;
}

export function UnifiedCalendar({ 
  selectedDate,
  onDateSelect,
  selectedTimeSlots,
  onTimeSlotSelect,
  selectedStylists
}: UnifiedCalendarProps) {
  const { items } = useCart();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const totalDuration = useMemo(() => {
    return items.reduce((total, item) => {
      return total + (item.service?.duration || item.package?.duration || 30);
    }, 0);
  }, [items]);

  // Fetch location hours
  const { data: locationData } = useQuery({
    queryKey: ['location'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          location_hours (*)
        `)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      console.log('Location data:', data);
      return data;
    },
  });

  // Fetch existing bookings for the selected date
  const { data: existingBookings } = useQuery({
    queryKey: ['bookings', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('bookings')
        .select('*, employee:employees(*)')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate
  });

  // Fetch employee shifts if stylists are selected
  const { data: shifts } = useQuery({
    queryKey: ['shifts', selectedDate, Object.values(selectedStylists)],
    queryFn: async () => {
      if (!selectedDate) return [];

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from('shifts')
        .select('*')
        .gte('start_time', startOfDay.toISOString())
        .lte('end_time', endOfDay.toISOString());

      const specificStylists = Object.values(selectedStylists).filter(id => id !== 'any');
      if (specificStylists.length > 0) {
        query = query.in('employee_id', specificStylists);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate && Object.values(selectedStylists).some(id => id !== 'any')
  });

  // Generate available time slots
  useEffect(() => {
    if (!selectedDate || (!shifts && !locationData)) return;

    const generateTimeSlots = () => {
      const slots: TimeSlot[] = [];
      const dayOfWeek = selectedDate.getDay();
      
      // Get location hours for the selected day
      const locationHours = locationData?.location_hours?.find(
        (h: any) => h.day_of_week === dayOfWeek
      );

      // If no stylists are selected or all stylists are 'any', use location hours
      const useLocationHours = Object.values(selectedStylists).every(id => !id || id === 'any');
      
      if (useLocationHours && locationHours) {
        console.log('Using location hours:', locationHours);
        const [startHour] = locationHours.start_time.split(':').map(Number);
        const [endHour] = locationHours.end_time.split(':').map(Number);
        
        for (let hour = startHour; hour < endHour; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const slotStart = new Date(selectedDate);
            slotStart.setHours(hour, minute, 0, 0);
            
            // Calculate end time based on total duration
            const slotEnd = addMinutes(slotStart, totalDuration);
            
            // Skip if the slot would end after location closing time
            const closingTime = new Date(selectedDate);
            closingTime.setHours(endHour, 0, 0, 0);
            if (slotEnd > closingTime) continue;

            // Check conflicts with existing bookings
            const hasConflict = existingBookings?.some(booking => {
              const bookingStart = new Date(booking.start_time);
              const bookingEnd = new Date(booking.end_time);
              return (
                (slotStart >= bookingStart && slotStart < bookingEnd) ||
                (slotEnd > bookingStart && slotEnd <= bookingEnd)
              );
            });

            const isSelected = Object.values(selectedTimeSlots).includes(timeString);

            slots.push({
              time: timeString,
              endTime: format(slotEnd, 'HH:mm'),
              isAvailable: !hasConflict,
              isSelected,
            });
          }
        }
      } else if (shifts) {
        // Use stylist shifts
        console.log('Using stylist shifts:', shifts);
        shifts.forEach(shift => {
          const shiftStart = new Date(shift.start_time);
          const shiftEnd = new Date(shift.end_time);
          
          for (let hour = shiftStart.getHours(); hour < shiftEnd.getHours(); hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
              const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              const slotStart = new Date(selectedDate);
              slotStart.setHours(hour, minute, 0, 0);
              
              // Calculate end time based on total duration
              const slotEnd = addMinutes(slotStart, totalDuration);
              
              // Skip if the slot would end after shift end time
              if (slotEnd > shiftEnd) continue;

              // Check conflicts with existing bookings
              const hasConflict = existingBookings?.some(booking => {
                const bookingStart = new Date(booking.start_time);
                const bookingEnd = new Date(booking.end_time);
                return (
                  (slotStart >= bookingStart && slotStart < bookingEnd) ||
                  (slotEnd > bookingStart && slotEnd <= bookingEnd)
                );
              });

              const isSelected = Object.values(selectedTimeSlots).includes(timeString);

              slots.push({
                time: timeString,
                endTime: format(slotEnd, 'HH:mm'),
                isAvailable: !hasConflict,
                isSelected,
              });
            }
          }
        });
      }
      
      return slots.sort((a, b) => a.time.localeCompare(b.time));
    };

    const generatedSlots = generateTimeSlots();
    console.log('Generated slots:', generatedSlots);
    setTimeSlots(generatedSlots);
  }, [selectedDate, existingBookings, selectedTimeSlots, selectedStylists, shifts, locationData, totalDuration]);

  return (
    <ModernScheduler
      selectedDate={selectedDate}
      onDateSelect={onDateSelect}
      selectedTimeSlots={selectedTimeSlots}
      onTimeSlotSelect={onTimeSlotSelect}
      timeSlots={timeSlots}
      items={items}
    />
  );
}
