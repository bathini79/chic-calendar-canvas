import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useCart } from "@/components/cart/CartContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isSelected: boolean;
  stylistId?: string;
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
        .select('*')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());

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
          
          // Check if this slot conflicts with any existing bookings
          const isBooked = existingBookings?.some(booking => {
            const bookingTime = new Date(booking.start_time);
            return bookingTime.getHours() === hour && bookingTime.getMinutes() === minute;
          });

          slots.push({
            time: timeString,
            isAvailable: !isBooked,
            isSelected: Object.values(selectedTimeSlots).includes(timeString)
          });
        }
        hour++;
      }
      return slots;
    };

    setTimeSlots(generateTimeSlots());
  }, [selectedDate, existingBookings, selectedTimeSlots]);

  const handleTimeSlotSelect = (time: string) => {
    // Find the first unscheduled item
    const unscheduledItem = items.find(item => !selectedTimeSlots[item.id]);
    if (unscheduledItem) {
      onTimeSlotSelect(unscheduledItem.id, time);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Date & Time</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-[1fr_300px] gap-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            className="rounded-md border"
            disabled={(date) => {
              // Disable past dates and weekends
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
              <CardHeader>
                <CardTitle className="text-sm">
                  {format(selectedDate, "MMMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((slot) => (
                      <Badge
                        key={slot.time}
                        variant={slot.isSelected ? "default" : slot.isAvailable ? "secondary" : "outline"}
                        className={cn(
                          "py-2 cursor-pointer transition-colors",
                          !slot.isAvailable && "opacity-50 cursor-not-allowed",
                          slot.isSelected && "bg-primary"
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

        {selectedDate && (
          <div className="space-y-2">
            <h3 className="font-medium">Selected Times</h3>
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.service?.name || item.package?.name}</span>
                  <span className="text-muted-foreground">
                    {selectedTimeSlots[item.id] || "Not scheduled"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}