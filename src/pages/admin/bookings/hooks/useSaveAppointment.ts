import { useState, useCallback } from 'react';
import { format, addMinutes } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

// ... other imports and types

interface UseSaveAppointmentProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  selectedCustomer: any | null; // Replace 'any' with your Customer type
  selectedServices: string[];
  selectedPackages: string[];
  services: any[] | null; // Replace 'any' with your Service type
  packages: any[] | null; // Replace 'any' with your Package type
  selectedStylists: Record<string, string>;
  getTotalDuration: (selectedServices: string[], selectedPackages: string[], services: any[], packages: any[]) => number; // Adjust parameter types if necessary
  getTotalPrice: (selectedServices: string[], selectedPackages: string[], services: any[], packages: any[]) => number; // Adjust parameter types if necessary
}

const useSaveAppointment = ({
  selectedDate,
  selectedTime,
  selectedCustomer,
  selectedServices,
  selectedPackages,
  services,
  packages,
  selectedStylists,
  getTotalDuration,
  getTotalPrice,
}: UseSaveAppointmentProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveAppointment = useCallback(async (): Promise<string | null> => {
    setIsSaving(true);
    setSaveError(null);

    if (!selectedDate || !selectedTime || !selectedCustomer) {
      toast.error("Please select a date, time and customer");
      setIsSaving(false);
      return null;
    }

    try {
      const startDateTime = new Date(
        `${format(selectedDate, "yyyy-MM-dd")} ${selectedTime}`
      );
      if (isNaN(startDateTime.getTime())) {
        console.error(
          `Invalid date generated, date: ${format(
            selectedDate,
            "yyyy-MM-dd"
          )}, time: ${selectedTime}`
        );
        setIsSaving(false);
        return null;
      }

      const totalDuration = getTotalDuration(
        selectedServices,
        selectedPackages,
        services || [],
        packages || []
      );
      const endDateTime = addMinutes(startDateTime, totalDuration);

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_id: selectedCustomer.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: "confirmed",
          number_of_bookings: selectedServices.length + selectedPackages.length,
          total_price: getTotalPrice(
            selectedServices,
            selectedPackages,
            services || [],
            packages || []
          ),
          total_duration: totalDuration,
        })
        .select();

      if (appointmentError) {
        console.error("Error inserting appointment:", appointmentError);
        toast.error("Failed to create appointment. Please try again.");
        throw appointmentError;
      }

      const appointmentId = appointmentData[0].id;
      let currentStartTime = startDateTime;

      const allSelectedItems = [
        ...selectedServices.map((id) => ({ type: "service", id })),
        ...selectedPackages.map((id) => ({ type: "package", id })),
      ];

      for (const item of allSelectedItems) {
        let bookingEndTime: Date;
        let bookingData = {};
        if (item.type === "service") {
          const service = services?.find((s) => s.id === item.id);
          if (!service) continue;
          bookingEndTime = addMinutes(currentStartTime, service.duration);
          bookingData = {
            appointment_id: appointmentId,
            service_id: service.id,
            status: "confirmed",
            price_paid: service.selling_price,
            employee_id: selectedStylists[service.id],
            start_time: currentStartTime.toISOString(),
            end_time: bookingEndTime.toISOString(),
          };
        } else {
          const pkg = packages?.find((p) => p.id === item.id);
          if (!pkg) continue;
          bookingEndTime = addMinutes(currentStartTime, pkg.duration);
          bookingData = {
            appointment_id: appointmentId,
            package_id: pkg.id,
            status: "confirmed",
            price_paid: pkg.price,
            start_time: currentStartTime.toISOString(),
            end_time: bookingEndTime.toISOString(),
          };
        }
        const { error: bookingError } = await supabase
          .from("bookings")
          .insert(bookingData);
        if (bookingError) {
          console.error(`Error inserting ${item.type} booking:`, bookingError);
          toast.error(
            `Failed to create ${item.type} booking. Please try again.`
          );
          throw bookingError;
        }
        currentStartTime = bookingEndTime;
      }

      toast.success("Appointment saved successfully");
      setIsSaving(false);
      return appointmentId;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
      setSaveError(error.message || "Failed to save appointment")
      setIsSaving(false);
      return null;
    }
  }, [selectedDate, selectedTime, selectedCustomer, selectedServices, selectedPackages, services, packages, selectedStylists, getTotalDuration, getTotalPrice]); // Dependency array

  return { handleSaveAppointment, isSaving, saveError };
};

export default useSaveAppointment;
