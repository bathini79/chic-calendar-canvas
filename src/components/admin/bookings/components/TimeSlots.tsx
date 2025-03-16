
import { useMemo, useState } from "react";
import { format, addMinutes } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Employee } from "@/pages/admin/bookings/types";

interface TimeSlotsProps {
  date: Date;
  services: any[];
  packages: any[];
  selectedServices: string[];
  selectedPackages: string[];
  availableStylists: Employee[];
  selectedStylists: Record<string, string>;
  onTimeSelect: (time: string) => void;
  customizedServices: Record<string, string[]>;
  locationId?: string;
  openingHours?: {
    start: string;
    end: string;
  };
}

export const TimeSlots = ({
  date,
  services,
  packages,
  selectedServices,
  selectedPackages,
  availableStylists,
  selectedStylists,
  onTimeSelect,
  customizedServices,
  locationId,
  openingHours = { start: "09:00", end: "21:00" }
}: TimeSlotsProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [timeSlotInterval, setTimeSlotInterval] = useState(30); // minutes

  const getServiceDuration = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.duration : 0;
  };

  const getPackageDuration = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return 0;
    
    let duration = 0;
    // Add duration for base package services
    pkg.package_services?.forEach((ps: any) => {
      duration += ps.service.duration || 0;
    });
    
    // Add duration for customized services if any
    const customServices = customizedServices[packageId] || [];
    customServices.forEach(serviceId => {
      // Only add duration if it's not part of the base package
      const isInBasePackage = pkg.package_services?.some((ps: any) => ps.service.id === serviceId);
      if (!isInBasePackage) {
        duration += getServiceDuration(serviceId);
      }
    });
    
    return duration;
  };

  const totalDuration = useMemo(() => {
    let duration = 0;
    selectedServices.forEach(serviceId => {
      duration += getServiceDuration(serviceId);
    });
    selectedPackages.forEach(packageId => {
      duration += getPackageDuration(packageId);
    });
    return duration;
  }, [selectedServices, selectedPackages, customizedServices]);

  // Generate time slots based on opening hours
  const timeSlots = useMemo(() => {
    const slots = [];
    const [startHour, startMinute] = openingHours.start.split(":").map(Number);
    const [endHour, endMinute] = openingHours.end.split(":").map(Number);
    
    const startTime = new Date(date);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    // Subtract total service duration from end time to ensure last slot fits
    const adjustedEndTime = new Date(endTime.getTime() - totalDuration * 60000);
    
    let currentTime = new Date(startTime);
    
    while (currentTime <= adjustedEndTime) {
      slots.push(format(currentTime, "HH:mm"));
      currentTime = addMinutes(currentTime, timeSlotInterval);
    }
    
    return slots;
  }, [date, openingHours, timeSlotInterval, totalDuration]);

  // Filter stylists based on location
  const locationStylists = availableStylists.filter(stylist => {
    // Filter logic would go here when we implement location-based filtering
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select Employee (Optional)</label>
          <Select
            value={selectedEmployee}
            onValueChange={setSelectedEmployee}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any employee</SelectItem>
              {locationStylists.map((stylist) => (
                <SelectItem key={stylist.id} value={stylist.id}>
                  <div className="flex items-center gap-2">
                    {stylist.photo_url && (
                      <img
                        src={stylist.photo_url}
                        alt={stylist.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    )}
                    <span>{stylist.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Time Slot Interval</label>
          <Select
            value={timeSlotInterval.toString()}
            onValueChange={(value) => setTimeSlotInterval(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Available Time Slots</h3>
        <ScrollArea className="h-[200px] rounded-md border p-2">
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((time) => (
              <Button
                key={time}
                variant="outline"
                className="text-sm py-1 px-2 h-auto"
                onClick={() => onTimeSelect(time)}
              >
                {time}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
