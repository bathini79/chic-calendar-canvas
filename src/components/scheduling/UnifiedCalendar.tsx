import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMinutes, parseISO, addDays, subDays } from "date-fns";
import { useCart } from "@/components/cart/CartContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Clock, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  const totalDuration = useMemo(() => {
    return items.reduce((total, item) => {
      return total + (item.service?.duration || item.package?.duration || 30);
    }, 0);
  }, [items]);

  // Generate week dates
  useEffect(() => {
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    setWeekDates(dates);
    if (!selectedDate) {
      onDateSelect(today);
    }
  }, [selectedDate, onDateSelect]);

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
      return data;
    },
  });

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

  // Generate time slots logic
  useEffect(() => {
    if (!selectedDate || (!existingBookings && !locationData)) return;

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
      }
      
      return slots.sort((a, b) => a.time.localeCompare(b.time));
    };

    const generatedSlots = generateTimeSlots();
    setTimeSlots(generatedSlots);
  }, [selectedDate, existingBookings, selectedTimeSlots, selectedStylists, locationData, totalDuration]);

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CalendarClock className="h-6 w-6" />
            Select Time
          </CardTitle>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-lg font-medium">
            {selectedDate ? format(selectedDate, "MMMM yyyy") : "Select a date"}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => selectedDate && onDateSelect(subDays(selectedDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => selectedDate && onDateSelect(addDays(selectedDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Date Picker Strip */}
        <ScrollArea className="w-full mt-4">
          <div className="flex gap-2 pb-4">
            {weekDates.map((date) => (
              <Button
                key={date.toISOString()}
                variant={selectedDate?.toDateString() === date.toDateString() ? "default" : "outline"}
                className={cn(
                  "flex-col h-[4.5rem] w-[4.5rem] rounded-full p-0",
                  selectedDate?.toDateString() === date.toDateString() 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-accent"
                )}
                onClick={() => onDateSelect(date)}
              >
                <span className="text-2xl font-semibold">{format(date, "d")}</span>
                <span className="text-xs mt-1">{format(date, "EEE")}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </CardHeader>

      <CardContent>
        {selectedDate && (
          timeSlots.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.map((slot) => (
                <Badge
                  key={slot.time}
                  variant={slot.isSelected ? "default" : slot.isAvailable ? "secondary" : "outline"}
                  className={cn(
                    "py-4 cursor-pointer transition-colors justify-center flex-col h-auto",
                    !slot.isAvailable && "opacity-50 cursor-not-allowed",
                    slot.isSelected && "bg-primary hover:bg-primary/90",
                    !slot.isAvailable && !slot.isSelected && "bg-muted text-muted-foreground"
                  )}
                  onClick={() => {
                    if (slot.isAvailable && !slot.isSelected) {
                      items.forEach((item) => {
                        onTimeSlotSelect(item.id, slot.time);
                      });
                    }
                  }}
                >
                  <span className="font-medium">{slot.time} - {slot.endTime}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Fully booked on this date</h3>
              <p className="text-muted-foreground mb-4">
                Available from {format(addDays(selectedDate, 1), "EEE, d MMM")}
              </p>
              <Button
                onClick={() => {
                  const nextDay = addDays(selectedDate, 1);
                  onDateSelect(nextDay);
                }}
              >
                Go to next available date
              </Button>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
