import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addDays, startOfToday, isSameDay, addMinutes, parseISO, isToday, isBefore } from "date-fns";
import { useCart } from "@/components/cart/CartContext";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  locationId?: string;
}

export function UnifiedCalendar({ 
  selectedDate,
  onDateSelect,
  selectedTimeSlots,
  onTimeSlotSelect,
  selectedStylists,
  locationId
}: UnifiedCalendarProps) {
  const { items } = useCart();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    const today = startOfToday();
    const dates = Array.from({ length: 60 }, (_, i) => addDays(today, i));
    setWeekDates(dates);
    
    if (!selectedDate) {
      onDateSelect(today);
    }
  }, [selectedDate, onDateSelect]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDuration = a.service?.duration || a.duration || a.package?.duration || 0;
      const bDuration = b.service?.duration || b.duration || b.package?.duration || 0;
      return bDuration - aDuration; // Sort by duration (longest first)
    });
  }, [items]);

  const totalDuration = useMemo(() => {
    return sortedItems.reduce((total, item) => {
      return total + (item.service?.duration || item.duration || item.package?.duration || 0);
    }, 0);
  }, [sortedItems]);

  const { data: locationData } = useQuery({
    queryKey: ['location', locationId],
    queryFn: async () => {
      if (!locationId) return null;
      
      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          location_hours (*)
        `)
        .eq('id', locationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!locationId
  });

  const { data: existingBookings } = useQuery({
    queryKey: ['bookings', selectedDate, locationId],
    queryFn: async () => {
      if (!selectedDate || !locationId) return [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('bookings')
        .select('*, employee:employees(*), appointment:appointments(*)')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .eq('appointments.location', locationId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDate && !!locationId
  });

  useEffect(() => {
    if (!selectedDate || !locationData) return;

    const generateTimeSlots = () => {
      const slots: TimeSlot[] = [];
      const dayOfWeek = selectedDate.getDay();
      const currentTime = new Date();
      const isSelectedDateToday = isToday(selectedDate);
      
      const locationHours = locationData.location_hours?.find(
        (h: any) => h.day_of_week === dayOfWeek
      );

      const hasSpecificStylists = Object.values(selectedStylists).some(
        id => id && id !== 'any'
      );

      if (locationHours && !locationHours.is_closed) {
        const [startHour, startMinute] = locationHours.start_time.split(':').map(Number);
        const [endHour, endMinute] = locationHours.end_time.split(':').map(Number);
        
        let currentHour = startHour;
        let currentMinute = startMinute;

        while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
          const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          const slotStart = new Date(selectedDate);
          slotStart.setHours(currentHour, currentMinute, 0, 0);
          
          const slotEnd = addMinutes(slotStart, totalDuration);
          
          const closingTime = new Date(selectedDate);
          closingTime.setHours(endHour, endMinute, 0, 0);
          
          // Skip past time slots for today
          if (isSelectedDateToday && isBefore(slotStart, currentTime)) {
            // Increment by 30 minutes and continue to next iteration
            currentMinute += 30;
            if (currentMinute >= 60) {
              currentHour += 1;
              currentMinute = 0;
            }
            continue;
          }
          
          // Only add the slot if it ends before closing time
          if (slotEnd <= closingTime) {
            const hasConflict = existingBookings?.some(booking => {
              const bookingStart = new Date(booking.start_time);
              const bookingEnd = new Date(booking.end_time);
              
              return (
                (slotStart <= bookingEnd && slotEnd >= bookingStart)
              );
            });

            const firstItemId = sortedItems.length > 0 ? sortedItems[0].id : '';
            const isSelected = firstItemId && selectedTimeSlots[firstItemId] === timeString;

            slots.push({
              time: timeString,
              endTime: format(slotEnd, 'HH:mm'),
              isAvailable: !hasConflict,
              isSelected,
            });
          }
          
          // Increment by 30 minutes
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute = 0;
          }
        }
      }
      
      return slots.sort((a, b) => a.time.localeCompare(b.time));
    };

    const generatedSlots = generateTimeSlots();
    setTimeSlots(generatedSlots);
  }, [selectedDate, existingBookings, selectedTimeSlots, selectedStylists, locationData, totalDuration, sortedItems]);

  const calculateSequentialTimeSlots = (startTimeString: string) => {
    if (!selectedDate || sortedItems.length === 0) return {};
    
    let currentStartTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${startTimeString}`);
    const newTimeSlots: Record<string, string> = {};
    
    // Process all top-level items first (services and packages)
    sortedItems.forEach((item) => {
      // First, set the time slot for the cart item id
      const itemId = item.id;
      newTimeSlots[itemId] = format(currentStartTime, 'HH:mm');
      
      // For services, also store the time slot with the actual service_id as a key
      if (item.type === 'service' && item.service_id) {
        newTimeSlots[item.service_id] = format(currentStartTime, 'HH:mm');
      }
      
      // For packages, also set time slots for all package services
      if (item.type === 'package' && item.package) {
        // Get services in this package
        const packageData = item.package || {};
        
        if (packageData.package_services) {
          // Handle standard package structure with package_services array
          packageData.package_services.forEach(ps => {
            if (ps.service && ps.service.id) {
              newTimeSlots[ps.service.id] = format(currentStartTime, 'HH:mm');
            }
          });
        } else if (packageData.services) {
          // Package has inline services
          packageData.services.forEach(svc => {
            if (svc.id) {
              newTimeSlots[svc.id] = format(currentStartTime, 'HH:mm');
            }
          });
        }
        
        // Also store with package_id if available
        if (item.package_id) {
          newTimeSlots[item.package_id] = format(currentStartTime, 'HH:mm');
        }
      }
      
      // Advance the start time by the item's duration
      const itemDuration = item.service?.duration || item.duration || item.package?.duration || 0;
      currentStartTime = addMinutes(currentStartTime, itemDuration);
    });
    
    return newTimeSlots;
  };

  const clearSelectedTimeSlots = () => {
    // Create a handler in the parent component to properly reset the state
    onTimeSlotSelect('reset', '');
  };

  return (
    <Card className="border-0 shadow-none bg-transparent w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <CalendarClock className="h-6 w-6" />
            Select Time
          </CardTitle>
        </div>
        
        {selectedDate && (
          <div className="mt-2 text-muted-foreground">
            {format(selectedDate, "MMMM yyyy")}
          </div>
        )}
        
        <div className="mt-4 -mx-4 px-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-4">
              {weekDates.map((date) => (
                <div
                  key={date.toISOString()}
                  className="flex flex-col items-center min-w-[3.5rem]"
                >
                  <Button
                    variant={selectedDate && isSameDay(selectedDate, date) ? "default" : "outline"}
                    className={cn(
                      "h-[3.5rem] w-[3.5rem] rounded-full p-0",
                      selectedDate && isSameDay(selectedDate, date)
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-accent"
                    )}
                    onClick={() => {
                      onDateSelect(date);
                      clearSelectedTimeSlots();
                    }}
                  >
                    <span className="text-2xl font-semibold">{format(date, "d")}</span>
                  </Button>
                  <span className="text-xs mt-2 text-muted-foreground">
                    {format(date, "EEE")}
                  </span>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0" />
          </ScrollArea>
        </div>
      </CardHeader>

      <CardContent>
        {selectedDate && (
          timeSlots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {timeSlots.map((slot) => (
                <Badge
                  key={slot.time}
                  variant={slot.isSelected ? "default" : slot.isAvailable ? "secondary" : "outline"}
                  className={cn(
                    "py-3 cursor-pointer transition-colors justify-center flex-col h-auto",
                    !slot.isAvailable && "opacity-50 cursor-not-allowed",
                    slot.isSelected && "bg-primary hover:bg-primary/90",
                    !slot.isAvailable && !slot.isSelected && "bg-muted text-muted-foreground"
                  )}
                  onClick={() => {
                    if (slot.isAvailable) {
                      if (slot.isSelected) {
                        clearSelectedTimeSlots();
                      } else {
                        clearSelectedTimeSlots();
                        
                        const sequentialTimeSlots = calculateSequentialTimeSlots(slot.time);
                        
                        Object.entries(sequentialTimeSlots).forEach(([itemId, timeSlot]) => {
                          onTimeSlotSelect(itemId, timeSlot);
                        });
                      }
                    }
                  }}
                >
                  <span className="font-medium text-sm">{slot.time} - {slot.endTime}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No available slots</h3>
              <p className="text-muted-foreground mb-4">
                {isToday(selectedDate) 
                  ? "No more available time slots for today"
                  : locationData?.location_hours?.some((h: any) => h.day_of_week === selectedDate.getDay() && !h.is_closed)
                    ? "Please select a different date or time"
                    : "Location is closed on this day"}
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
