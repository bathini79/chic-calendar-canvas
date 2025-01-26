import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, isSameDay, addMinutes, isWithinInterval, parse } from "date-fns";
import { toast } from "sonner";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
}

export function BookingDialog({ open, onOpenChange, item }: BookingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedStylist, setSelectedStylist] = useState<string>();
  const [selectedTime, setSelectedTime] = useState<string>();

  // Query for location data
  const { data: location } = useQuery({
    queryKey: ['location'],
    enabled: open,
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

  const { data: stylists } = useQuery({
    queryKey: ['stylists'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employment_type', 'stylist')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: shifts } = useQuery({
    queryKey: ['shifts', selectedStylist],
    enabled: open && selectedStylist && selectedStylist !== 'any_stylist',
    queryFn: async () => {
      let query = supabase
        .from('shifts')
        .select('*')
        .gte('start_time', new Date().toISOString());

      if (selectedStylist) {
        query = query.eq('employee_id', selectedStylist);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: existingBookings } = useQuery({
    queryKey: ['existing-bookings', selectedDate, selectedStylist],
    enabled: open && !!selectedDate,
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select('*')
        .gte('start_time', format(selectedDate!, 'yyyy-MM-dd'));

      if (selectedStylist && selectedStylist !== 'any_stylist') {
        query = query.eq('employee_id', selectedStylist);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getAvailableDates = () => {
    if (!location) return [];
    if (selectedStylist === 'any_stylist') {
      // Return all dates that have location hours and aren't closed
      const today = new Date();
      const dates: Date[] = [];
      for (let i = 0; i < 30; i++) {
        const date = addMinutes(today, i * 24 * 60);
        const dayOfWeek = date.getDay();
        const locationHours = location.location_hours.find(h => h.day_of_week === dayOfWeek);
        if (locationHours && !locationHours.is_closed) {
          dates.push(date);
        }
      }
      return dates;
    }
    if (!shifts) return [];
    return shifts.map(shift => new Date(shift.start_time));
  };

  const getAvailableTimeSlots = () => {
    if (!selectedDate) return [];
    
    const slots: { value: string; label: string; }[] = [];
    const duration = item.service?.duration || item.package?.duration || 30;
    
    if (selectedStylist === 'any_stylist' && location) {
      // Use location hours
      const dayOfWeek = selectedDate.getDay();
      const locationHours = location.location_hours.find(h => h.day_of_week === dayOfWeek);
      
      if (locationHours && !locationHours.is_closed) {
        const startTime = parse(locationHours.start_time, 'HH:mm:ss', selectedDate);
        const endTime = parse(locationHours.end_time, 'HH:mm:ss', selectedDate);
        let currentSlot = startTime;

        while (addMinutes(currentSlot, duration) <= endTime) {
          const slotEnd = addMinutes(currentSlot, duration);
          const isSlotAvailable = !existingBookings?.some(booking => {
            const bookingStart = new Date(booking.start_time);
            const bookingEnd = new Date(booking.end_time);
            return (
              isWithinInterval(currentSlot, { start: bookingStart, end: bookingEnd }) ||
              isWithinInterval(slotEnd, { start: bookingStart, end: bookingEnd })
            );
          });

          if (isSlotAvailable) {
            slots.push({
              value: format(currentSlot, 'HH:mm'),
              label: format(currentSlot, 'h:mm a'),
            });
          }
          currentSlot = addMinutes(currentSlot, duration);
        }
      }
    } else if (shifts) {
      // Use stylist shifts
      const dayShifts = shifts.filter(shift => 
        isSameDay(new Date(shift.start_time), selectedDate)
      );

      dayShifts.forEach(shift => {
        const startTime = new Date(shift.start_time);
        const endTime = new Date(shift.end_time);
        let currentSlot = startTime;

        while (addMinutes(currentSlot, duration) <= endTime) {
          const slotEnd = addMinutes(currentSlot, duration);
          const isSlotAvailable = !existingBookings?.some(booking => {
            const bookingStart = new Date(booking.start_time);
            const bookingEnd = new Date(booking.end_time);
            return (
              isWithinInterval(currentSlot, { start: bookingStart, end: bookingEnd }) ||
              isWithinInterval(slotEnd, { start: bookingStart, end: bookingEnd })
            );
          });

          if (isSlotAvailable) {
            slots.push({
              value: format(currentSlot, 'HH:mm'),
              label: format(currentSlot, 'h:mm a'),
            });
          }
          currentSlot = addMinutes(currentSlot, duration);
        }
      });
    }

    return slots;
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select booking details");
      return;
    }

    const startTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`);
    const endTime = addMinutes(startTime, item.service?.duration || item.package?.duration || 30);

    const { error } = await supabase
      .from('bookings')
      .insert([
        {
          service_id: item.service_id,
          package_id: item.package_id,
          employee_id: selectedStylist === 'any_stylist' ? null : selectedStylist,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        },
      ]);

    if (error) {
      toast.error("Error creating booking");
      return;
    }

    await supabase
      .from('cart_items')
      .update({ status: 'scheduled' })
      .eq('id', item.id);

    toast.success("Appointment scheduled successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Stylist (Optional)</label>
            <Select
              value={selectedStylist}
              onValueChange={(value) => {
                setSelectedStylist(value);
                setSelectedDate(undefined);
                setSelectedTime(undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a stylist or select any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any_stylist">Any Available Stylist</SelectItem>
                {stylists?.map((stylist) => (
                  <SelectItem key={stylist.id} value={stylist.id}>
                    {stylist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date</label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedTime(undefined);
              }}
              disabled={(date) => {
                const availableDates = getAvailableDates();
                return !availableDates.some(availableDate => 
                  isSameDay(date, availableDate)
                );
              }}
              className="rounded-md border"
            />
          </div>

          {selectedDate && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Time</label>
              <Select
                value={selectedTime}
                onValueChange={setSelectedTime}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a time" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableTimeSlots().map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleBook}
            disabled={!selectedDate || !selectedTime}
          >
            Book Appointment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}