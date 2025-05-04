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

interface StaffAvailability {
  id: string;
  isAvailable: boolean;
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

  // Track availability of stylists at different time slots
  const [stylistAvailability, setStylistAvailability] = useState<Record<string, StaffAvailability[]>>({});

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

  // Extract all service IDs from items
  const serviceIds = useMemo(() => {
    const ids: string[] = [];
    items.forEach(item => {
      if (item.service_id) {
        ids.push(item.service_id);
      }
      
      if (item.package?.package_services) {
        item.package.package_services.forEach((ps: any) => {
          if (ps.service && ps.service.id) {
            ids.push(ps.service.id);
          }
        });
      }
      
      if (item.customized_services?.length) {
        ids.push(...item.customized_services);
      }
    });
    return [...new Set(ids)]; // Remove duplicates
  }, [items]);

  // Extract all selected stylist IDs
  const selectedStylistIds = useMemo(() => {
    return Object.values(selectedStylists)
      .filter(id => id && id !== 'any');
  }, [selectedStylists]);

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

  // Query for employee skills to know which stylists can perform services
  const { data: employeeSkills } = useQuery({
    queryKey: ['employee-skills', serviceIds],
    queryFn: async () => {
      if (serviceIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('employee_skills')
        .select('employee_id, service_id')
        .in('service_id', serviceIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: serviceIds.length > 0
  });

  // Fetch all location employees
  const { data: locationEmployees } = useQuery({
    queryKey: ['location-employees', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          employee_locations!inner(location_id)
        `)
        .eq('employment_type', 'stylist')
        .eq('status', 'active')
        .eq('employee_locations.location_id', locationId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!locationId
  });

  // Query for regular shifts
  const { data: regularShifts } = useQuery({
    queryKey: ['regular-shifts', locationId, selectedDate],
    queryFn: async () => {
      if (!locationId || !selectedDate) return [];
      
      const dayOfWeek = selectedDate.getDay();
      
      const { data, error } = await supabase
        .from('recurring_shifts')
        .select('*')
        .eq('location_id', locationId)
        .eq('day_of_week', dayOfWeek);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!locationId && !!selectedDate
  });

  // Query for time off requests
  const { data: timeOffRequests } = useQuery({
    queryKey: ['time-off-requests', locationId, selectedDate],
    queryFn: async () => {
      if (!locationId || !selectedDate) return [];
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('status', 'approved')
        .lte('start_date', dateStr)
        .gte('end_date', dateStr);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!locationId && !!selectedDate
  });

  // Query for existing bookings
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

  // Get service to employees mapping
  const serviceToEmployeesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    
    if (employeeSkills) {
      employeeSkills.forEach(skill => {
        if (!map[skill.service_id]) {
          map[skill.service_id] = [];
        }
        map[skill.service_id].push(skill.employee_id);
      });
    }
    
    return map;
  }, [employeeSkills]);

  // Check if a stylist is available at a specific time
  const isStylistAvailableAtTime = (
    stylistId: string, 
    timeString: string,
    serviceDuration: number
  ): boolean => {
    // If no selected date, we can't check availability
    if (!selectedDate) return false;
    
    // Create DateTime objects for the slot
    const slotStart = new Date(selectedDate);
    const [hours, minutes] = timeString.split(':').map(Number);
    slotStart.setHours(hours, minutes, 0, 0);
    
    const slotEnd = addMinutes(slotStart, serviceDuration);
    
    // Check if on time off
    const onTimeOff = timeOffRequests?.some(
      timeOff => timeOff.employee_id === stylistId
    );
    
    if (onTimeOff) return false;
    
    // Check regular shifts
    const stylistShifts = regularShifts?.filter(
      shift => shift.employee_id === stylistId
    );
    
    // If no shifts found, stylist doesn't work this day
    if (!stylistShifts || stylistShifts.length === 0) return false;
    
    // Check if the slot is within any of the stylist's shifts
    const withinShift = stylistShifts.some(shift => {
      const shiftStart = new Date(selectedDate);
      const shiftEnd = new Date(selectedDate);
      
      const [startHour, startMinute] = shift.start_time.split(':').map(Number);
      const [endHour, endMinute] = shift.end_time.split(':').map(Number);
      
      shiftStart.setHours(startHour, startMinute, 0, 0);
      shiftEnd.setHours(endHour, endMinute, 0, 0);
      
      // Fix: The appointment should be allowed to start any time before shift ends
      // as long as there's enough time to complete the service before closing
      return slotStart >= shiftStart && slotEnd <= shiftEnd;
    });
    
    if (!withinShift) return false;
    
    // Check if stylist has existing bookings
    const hasConflict = existingBookings?.some(booking => {
      if (booking.employee_id !== stylistId) return false;
      
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      return (slotStart < bookingEnd && slotEnd > bookingStart);
    });
    
    return !hasConflict;
  };

  // Update time slots based on all availability factors
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

      if (locationHours && !locationHours.is_closed) {
        const [startHour, startMinute] = locationHours.start_time.split(':').map(Number);
        const [endHour, endMinute] = locationHours.end_time.split(':').map(Number);
        
        let currentHour = startHour;
        let currentMinute = startMinute;

        // Track stylist availability for each time slot
        const availabilityByTime: Record<string, StaffAvailability[]> = {};

        // Generate time slots in 30-minute increments
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
          
          // Only add the slot if it ends before or at closing time
          // Fix: Allow slots that end exactly at closing time
          if (slotEnd <= closingTime) {
            // Create empty availability array for this time slot
            availabilityByTime[timeString] = [];
            
            // Check stylist availability for this time slot
            let hasAnyAvailableStylist = false;
            
            // For each service, check if there's at least one stylist available
            for (const serviceId of serviceIds) {
              // Get the stylists who can perform this service
              const stylistsForService = serviceToEmployeesMap[serviceId] || [];
              
              // If a specific stylist is selected for this service
              const selectedStylist = Object.entries(selectedStylists)
                .find(([id, _]) => id === serviceId)?.[1];
              
              if (selectedStylist && selectedStylist !== 'any') {
                // Check if this specific stylist is available
                const isAvailable = isStylistAvailableAtTime(
                  selectedStylist,
                  timeString,
                  totalDuration
                );
                
                availabilityByTime[timeString].push({
                  id: selectedStylist,
                  isAvailable
                });
                
                if (isAvailable) {
                  hasAnyAvailableStylist = true;
                }
              } else {
                // Check if any stylist who can perform this service is available
                const availableStylist = stylistsForService.some(stylistId => 
                  isStylistAvailableAtTime(stylistId, timeString, totalDuration)
                );
                
                if (availableStylist) {
                  hasAnyAvailableStylist = true;
                }
                
                // Add all potential stylists to the availability array
                stylistsForService.forEach(stylistId => {
                  const isAvailable = isStylistAvailableAtTime(
                    stylistId,
                    timeString,
                    totalDuration
                  );
                  
                  availabilityByTime[timeString].push({
                    id: stylistId,
                    isAvailable
                  });
                });
              }
            }
            
            const firstItemId = sortedItems.length > 0 ? sortedItems[0].id : '';
            const isSelected = firstItemId && selectedTimeSlots[firstItemId] === timeString;
            
            // If "any stylist" option is enabled, consider general availability
            const anyAvailable = hasAnyAvailableStylist || 
              Object.values(selectedStylists).some(s => s === 'any');

            slots.push({
              time: timeString,
              endTime: format(slotEnd, 'HH:mm'),
              isAvailable: anyAvailable,
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

        // Store stylist availability data
        setStylistAvailability(availabilityByTime);

        return slots.sort((a, b) => a.time.localeCompare(b.time));
      }
      
      return [];
    };

    const generatedSlots = generateTimeSlots();
    setTimeSlots(generatedSlots);
  }, [
    selectedDate, 
    existingBookings, 
    regularShifts,
    timeOffRequests,
    selectedTimeSlots, 
    selectedStylists, 
    locationData, 
    totalDuration, 
    sortedItems,
    serviceIds,
    serviceToEmployeesMap
  ]);

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
