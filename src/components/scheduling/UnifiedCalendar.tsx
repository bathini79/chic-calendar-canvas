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
import { CalendarClock, Clock, User2 } from "lucide-react";

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isSelected: boolean;
  stylistId?: string;
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

  // Generate available time slots
  useEffect(() => {
    if (!selectedDate) return;

    const generateTimeSlots = () => {
      const slots: TimeSlot[] = [];
      let hour = 9; // Start at 9 AM
      
      while (hour < 17) { // End at 5 PM
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          // Check conflicts with existing bookings and selected stylists
          const conflicts = existingBookings?.some(booking => {
            const bookingTime = new Date(booking.start_time);
            const isTimeMatch = bookingTime.getHours() === hour && bookingTime.getMinutes() === minute;
            
            if (!isTimeMatch) return false;

            // Check if this booking conflicts with any of our selected services
            return Object.entries(selectedStylists).some(([itemId, stylistId]) => {
              if (stylistId === 'any') {
                return true; // Any stylist booking blocks the slot
              }
              return booking.employee_id === stylistId;
            });
          });

          const isSelected = Object.values(selectedTimeSlots).includes(timeString);

          slots.push({
            time: timeString,
            isAvailable: !conflicts,
            isSelected,
            conflicts
          });
        }
        hour++;
      }
      return slots;
    };

    setTimeSlots(generateTimeSlots());
  }, [selectedDate, existingBookings, selectedTimeSlots, selectedStylists]);

  const handleTimeSlotSelect = (time: string) => {
    // Find the first unscheduled item
    const unscheduledItem = items.find(item => !selectedTimeSlots[item.id]);
    if (unscheduledItem) {
      onTimeSlotSelect(unscheduledItem.id, time);
    }
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
                          !slot.isAvailable && "opacity-50 cursor-not-allowed bg-muted",
                          slot.isSelected && "bg-primary hover:bg-primary/90",
                          slot.conflicts && "bg-red-100 text-red-700 hover:bg-red-200"
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

        {selectedDate && items.length > 0 && (
          <div className="mt-6 space-y-3 border-t pt-6">
            <h3 className="font-medium flex items-center gap-2">
              <User2 className="h-4 w-4" />
              Selected Times
            </h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/50 p-3">
                  <span className="font-medium">{item.service?.name || item.package?.name}</span>
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