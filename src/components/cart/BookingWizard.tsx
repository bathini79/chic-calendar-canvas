import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface BookingWizardProps {
  services: any[];
  onComplete: (bookings: any[]) => void;
  onCancel: () => void;
}

export function BookingWizard({ services, onComplete, onCancel }: BookingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();

  const currentService = services[currentStep];

  const { data: stylists } = useQuery({
    queryKey: ['stylists', currentService?.id],
    enabled: !!currentService,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_skills')
        .select(`
          employee:employees(
            id,
            name,
            status
          )
        `)
        .eq('service_id', currentService.id);
      
      if (error) throw error;
      return data.map(d => d.employee).filter(e => e.status === 'active');
    },
  });

  const { data: shifts } = useQuery({
    queryKey: ['shifts', selectedStylist, selectedDate],
    enabled: !!selectedStylist && !!selectedDate,
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

  const getAvailableTimeSlots = () => {
    if (!shifts || !selectedDate || !currentService) return [];
    
    const slots: { value: string; label: string; }[] = [];
    const duration = currentService.duration;
    
    shifts.forEach(shift => {
      const startTime = new Date(shift.start_time);
      const endTime = new Date(shift.end_time);
      let currentSlot = startTime;
      
      while (new Date(currentSlot.getTime() + duration * 60000) <= endTime) {
        slots.push({
          value: format(currentSlot, 'HH:mm'),
          label: format(currentSlot, 'h:mm a'),
        });
        currentSlot = new Date(currentSlot.getTime() + 30 * 60000); // 30-minute intervals
      }
    });

    return slots;
  };

  const handleNext = () => {
    if (!selectedStylist || !selectedDate || !selectedTime) return;

    const booking = {
      service: currentService,
      stylist: selectedStylist,
      date: selectedDate,
      time: selectedTime,
    };

    setBookings([...bookings, booking]);

    if (currentStep < services.length - 1) {
      setCurrentStep(currentStep + 1);
      setSelectedStylist(undefined);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
    } else {
      onComplete([...bookings, booking]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Schedule {currentService?.name}
        </h3>
        <Badge variant="secondary">
          Step {currentStep + 1} of {services.length}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
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

        {selectedStylist && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date</label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </div>
        )}

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
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {slot.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedStylist || !selectedDate || !selectedTime}
        >
          {currentStep === services.length - 1 ? 'Complete' : 'Next Service'}
        </Button>
      </div>
    </div>
  );
}