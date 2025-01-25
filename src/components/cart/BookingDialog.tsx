import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format } from "date-fns";
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
    queryKey: ['shifts', selectedStylist, selectedDate],
    enabled: !!(selectedStylist && selectedDate),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', selectedStylist)
        .gte('start_time', format(selectedDate!, 'yyyy-MM-dd'))
        .lte('start_time', format(selectedDate!, 'yyyy-MM-dd 23:59:59'));
      
      if (error) throw error;
      return data;
    },
  });

  const handleBook = async () => {
    if (!selectedStylist || !selectedDate || !selectedTime) {
      toast.error("Please select all booking details");
      return;
    }

    const startTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`);
    const endTime = new Date(startTime.getTime() + (item.service?.duration || item.package?.duration) * 60000);

    const { error } = await supabase
      .from('bookings')
      .insert([
        {
          service_id: item.service_id,
          package_id: item.package_id,
          employee_id: selectedStylist,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        },
      ]);

    if (error) {
      toast.error("Error creating booking");
      return;
    }

    // Update cart item status
    await supabase
      .from('cart_items')
      .update({ status: 'scheduled' })
      .eq('id', item.id);

    toast.success("Appointment scheduled successfully");
    onOpenChange(false);
  };

  const getAvailableTimeSlots = () => {
    if (!shifts) return [];
    return shifts.map(shift => ({
      value: format(new Date(shift.start_time), 'HH:mm'),
      label: format(new Date(shift.start_time), 'h:mm a'),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Stylist</label>
            <Select
              value={selectedStylist}
              onValueChange={setSelectedStylist}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a stylist" />
              </SelectTrigger>
              <SelectContent>
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
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </div>

          {selectedDate && selectedStylist && (
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
            disabled={!selectedStylist || !selectedDate || !selectedTime}
          >
            Book Appointment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}