
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

      // Create bookings for individual services
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

      // Create bookings for packages and their services
      for (const packageId of selectedPackages) {
        const pkg = packages?.find(p => p.id === packageId);
        if (!pkg) continue;

        // Get package base services
        const baseServices = pkg.package_services.map((ps: any) => ps.service.id);
        
        // Calculate total duration and price for the package
        let packageDuration = pkg.duration;
        let packagePrice = pkg.price;

        // Create one booking for the package itself
        const packageEndTime = addMinutes(currentStartTime, packageDuration);
        const { error: packageBookingError } = await supabase
          .from("bookings")
          .insert({
            appointment_id: appointmentId,
            package_id: packageId,
            employee_id: selectedStylists[packageId],
            start_time: currentStartTime.toISOString(),
            end_time: packageEndTime.toISOString(),
            status: "confirmed",
            price_paid: packagePrice,
          });

        if (packageBookingError) {
          console.error("Error inserting package booking:", packageBookingError);
          throw packageBookingError;
        }

        // Create bookings for each service in the package
        for (const serviceId of baseServices) {
          const service = services?.find(s => s.id === serviceId);
          if (!service) continue;

          const serviceEndTime = addMinutes(currentStartTime, service.duration);
          const { error: serviceBookingError } = await supabase
            .from("bookings")
            .insert({
              appointment_id: appointmentId,
              service_id: serviceId,
              package_id: packageId, // Link to the package
              employee_id: selectedStylists[serviceId] || selectedStylists[packageId],
              start_time: currentStartTime.toISOString(),
              end_time: serviceEndTime.toISOString(),
              status: "confirmed",
              price_paid: 0, // Price is already included in the package booking
            });

          if (serviceBookingError) {
            console.error("Error inserting package service booking:", serviceBookingError);
            throw serviceBookingError;
          }

          currentStartTime = serviceEndTime;
        }

        // Handle customized services if present
        const customizedServices = pkg.customized_services || [];
        for (const serviceId of customizedServices) {
          const service = services?.find(s => s.id === serviceId);
          if (!service) continue;

          const serviceEndTime = addMinutes(currentStartTime, service.duration);
          const { error: customServiceBookingError } = await supabase
            .from("bookings")
            .insert({
              appointment_id: appointmentId,
              service_id: serviceId,
              package_id: packageId, // Link to the package
              employee_id: selectedStylists[serviceId] || selectedStylists[packageId],
              start_time: currentStartTime.toISOString(),
              end_time: serviceEndTime.toISOString(),
              status: "confirmed",
              price_paid: service.selling_price, // Additional service price
            });

          if (customServiceBookingError) {
            console.error("Error inserting customized service booking:", customServiceBookingError);
            throw customServiceBookingError;
          }

          currentStartTime = serviceEndTime;
        }
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
