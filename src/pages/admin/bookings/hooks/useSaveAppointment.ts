
import { useState, useCallback } from 'react';
import { format, addMinutes } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { Customer, Service, Package } from '../types';

interface UseSaveAppointmentProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[] | undefined;
  packages: Package[] | undefined;
  selectedStylists: Record<string, string>;
  getTotalDuration: (selectedServices: string[], selectedPackages: string[], services: Service[], packages: Package[]) => number;
  getTotalPrice: (selectedServices: string[], selectedPackages: string[], services: Service[], packages: Package[]) => number;
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

      // Create the appointment
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
        .select()
        .single();

      if (appointmentError) {
        console.error("Error inserting appointment:", appointmentError);
        toast.error("Failed to create appointment");
        throw appointmentError;
      }

      const appointmentId = appointmentData.id;
      let currentStartTime = startDateTime;

      // Create bookings for services
      for (const serviceId of selectedServices) {
        const service = services?.find(s => s.id === serviceId);
        if (!service) continue;

        const bookingEndTime = addMinutes(currentStartTime, service.duration);
        const { error: bookingError } = await supabase
          .from("bookings")
          .insert({
            appointment_id: appointmentId,
            service_id: serviceId,
            employee_id: selectedStylists[serviceId],
            start_time: currentStartTime.toISOString(),
            end_time: bookingEndTime.toISOString(),
            status: "confirmed",
            price_paid: service.selling_price,
          });

        if (bookingError) {
          console.error("Error inserting service booking:", bookingError);
          throw bookingError;
        }

        currentStartTime = bookingEndTime;
      }

      // Create bookings for packages
      for (const packageId of selectedPackages) {
        const pkg = packages?.find(p => p.id === packageId);
        if (!pkg) continue;

        // Create one booking for the package
        const bookingEndTime = addMinutes(currentStartTime, pkg.duration);
        const { error: bookingError } = await supabase
          .from("bookings")
          .insert({
            appointment_id: appointmentId,
            package_id: packageId,
            employee_id: selectedStylists[packageId],
            start_time: currentStartTime.toISOString(),
            end_time: bookingEndTime.toISOString(),
            status: "confirmed",
            price_paid: pkg.price,
          });

        if (bookingError) {
          console.error("Error inserting package booking:", bookingError);
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
      setSaveError(error.message || "Failed to save appointment");
      setIsSaving(false);
      return null;
    }
  }, [selectedDate, selectedTime, selectedCustomer, selectedServices, selectedPackages, services, packages, selectedStylists, getTotalDuration, getTotalPrice]);

  return { handleSaveAppointment, isSaving, saveError };
};

export default useSaveAppointment;
