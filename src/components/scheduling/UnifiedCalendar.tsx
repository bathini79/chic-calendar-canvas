import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMinutes, isSameDay, parseISO } from "date-fns";
import { useCart } from "@/components/cart/CartContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Clock } from "lucide-react";

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isSelected: boolean;
  conflicts?: boolean;
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

  // Calculate total duration of all services
  const totalDuration = useMemo(() => {
    return items.reduce((total, item) => {
      return total + (item.service?.duration || item.package?.duration || 30);
    }, 0);
  }, [items]);

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

  // Fetch employee shifts
  const { data: shifts } = useQuery({
    queryKey: ['shifts', selectedDate, Object.values(selectedStylists)],
    queryFn: async () => {
      if (!selectedDate) return [];

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .gte('start_time', startOfDay.toISOString())
        .lte('end_time', endOfDay.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate
  });

  // Generate available time slots
  useEffect(() => {
    if (!selectedDate) return;

    const generateTimeSlots = () => {
      const slots: TimeSlot[] = [];
      let hour = 9; // Start at 9 AM
      
      while (hour < 17) { // End at 5 PM
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotStart = new Date(selectedDate);
          slotStart.setHours(hour, minute, 0, 0);
          const slotEnd = addMinutes(slotStart, totalDuration);

          // Check if any stylist is available for this slot
          const hasAvailableShift = shifts?.some(shift => {
            // For "any" stylist, check all shifts
            const shiftStart = new Date(shift.start_time);
            const shiftEnd = new Date(shift.end_time);
            
            // Check if this shift belongs to a selected stylist
            const isSelectedStylist = Object.entries(selectedStylists).some(([_, stylistId]) => {
              return stylistId === 'any' || stylistId === shift.employee_id;
            });

            return isSelectedStylist && slotStart >= shiftStart && slotEnd <= shiftEnd;
          }) ?? true;

          // Check conflicts with existing bookings
          const hasConflict = existingBookings?.some(booking => {
            const bookingStart = new Date(booking.start_time);
            const bookingEnd = new Date(booking.end_time);
            
            // Check if this booking conflicts with selected stylists
            const stylistConflict = Object.entries(selectedStylists).some(([_, stylistId]) => {
              if (stylistId === 'any') return false;
              return booking.employee_id === stylistId;
            });

            return stylistConflict && (
              (slotStart >= bookingStart && slotStart < bookingEnd) ||
              (slotEnd > bookingStart && slotEnd <= bookingEnd)
            );
          });

          const isSelected = Object.values(selectedTimeSlots).includes(timeString);

          slots.push({
            time: timeString,
            isAvailable: hasAvailableShift && !hasConflict,
            isSelected,
            conflicts: !hasAvailableShift || hasConflict
          });
        }
        hour++;
      }
      return slots;
    };

    setTimeSlots(generateTimeSlots());
  }, [selectedDate, existingBookings, selectedTimeSlots, selectedStylists, shifts, totalDuration]);

  const handleTimeSlotSelect = (time: string) => {
    // When a time slot is selected, assign it to all services
    const startTime = time;
    let currentTime = startTime;
    
    items.forEach((item) => {
      onTimeSlotSelect(item.id, currentTime);
      // Calculate next start time based on service duration
      const duration = item.service?.duration || item.package?.duration || 30;
      const nextTime = new Date(selectedDate!);
      const [hours, minutes] = currentTime.split(':').map(Number);
      nextTime.setHours(hours, minutes);
      const newTime = addMinutes(nextTime, duration);
      currentTime = format(newTime, 'HH:mm');
    });
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Select Date & Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-[1fr_300px] gap-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            className="rounded-md border bg-card p-4"
            disabled={(date) => {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              return (
                date < now ||
                date.getDay() === 0 ||
                date.getDay() === 6
              );
            }}
          />

          {selectedDate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(selectedDate, "MMMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((slot) => (
                      <Badge
                        key={slot.time}
                        variant={slot.isSelected ? "default" : slot.isAvailable ? "secondary" : "outline"}
                        className={cn(
                          "py-2 cursor-pointer transition-colors justify-center",
                          !slot.isAvailable && "opacity-50 cursor-not-allowed",
                          slot.isSelected && "bg-primary hover:bg-primary/90",
                          !slot.isAvailable && !slot.isSelected && "bg-muted text-muted-foreground"
                        )}
                        onClick={() => {
                          if (slot.isAvailable && !slot.isSelected) {
                            handleTimeSlotSelect(slot.time);
                          }
                        }}
                      >
                        {slot.time}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}