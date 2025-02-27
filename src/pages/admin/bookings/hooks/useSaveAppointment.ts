import { useState, useCallback } from "react";
import { format, addMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Customer, Service, Package, SCREEN } from "../types";

interface UseSaveAppointmentProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[] | undefined;
  packages: Package[] | undefined;
  selectedStylists: Record<string, string>;
  getTotalDuration: (
    selectedServices: string[],
    selectedPackages: string[],
    services: Service[],
    packages: Package[]
  ) => number;
  getTotalPrice: (
    selectedServices: string[],
    selectedPackages: string[],
    services: Service[],
    packages: Package[]
  ) => number;
  discountType: "none" | "percentage" | "fixed";
  discountValue: number;
  paymentMethod: "cash" | "online";
  notes: string;
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
  discountType,
  discountValue,
  paymentMethod,
  notes,
  customizedServices,
  currentScreen
}: UseSaveAppointmentProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveAppointment = useCallback(async (): Promise<
    string | null
  > => {
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
        packages || [],
        customizedServices
      );
      const endDateTime = addMinutes(startDateTime, totalDuration);
      const totalPrice = getTotalPrice(
        selectedServices,
        selectedPackages,
        services || [],
        packages || [],
        customizedServices
      );

      // Calculate final price after discount
      const discountAmount =
        discountType === "percentage"
          ? (totalPrice * discountValue) / 100
          : discountType === "fixed"
          ? discountValue
          : 0;

      const finalPrice = totalPrice - discountAmount;
      let status = "" 
      if(currentScreen == SCREEN.CHECKOUT){
        status="completed"
      }
      else if(currentScreen == SCREEN.SERVICE_SELECTION){
        status="confirmed"
      }
      
      // Create the appointment
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_id: selectedCustomer.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status,
          number_of_bookings: selectedServices.length + selectedPackages.length,
          total_price: finalPrice,
          original_total_price: totalPrice,
          total_duration: totalDuration,
          discount_type: discountType,
          discount_value: discountValue,
          payment_method: paymentMethod,
          notes: notes,
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
        const service = services?.find((s) => s.id === serviceId);
        if (!service) continue;
        
        const stylistId = selectedStylists[serviceId];
        if (!stylistId) {
          toast.error(`Please select a stylist for ${service.name}`);
          setIsSaving(false);
          return null;
        }
        const bookingEndTime = addMinutes(currentStartTime, service.duration);
        const { error: bookingError } = await supabase.from("bookings").insert({
          appointment_id: appointmentId,
          service_id: serviceId,
          employee_id: stylistId,
          start_time: currentStartTime.toISOString(),
          end_time: bookingEndTime.toISOString(),
          status,
          price_paid: service.selling_price,
          original_price: service.original_price,
        });
        currentStartTime = bookingEndTime;

        if (bookingError) {
          console.error("Error inserting service booking:", bookingError);
          throw bookingError;
        }
      }

      // Create bookings for packages
      for (const packageId of selectedPackages) {
        const pkg = packages?.find((p) => p.id === packageId);
        if (!pkg) continue;

        const packageServices =
          pkg.package_services?.map((ps) => ps.service.id) || [];

        // Get all selected services for this package

        const selectedPackageServices = new Set([
          ...packageServices,

          ...(pkg.is_customizable
            ? pkg.customizable_services?.filter(
                (serviceId) => selectedStylists[serviceId]
              ) || []
            : []),
        ]);
        for (const serviceId of selectedPackageServices) {
          const service = services?.find((s) => s.id === serviceId);

          if (!service) continue;

          const stylistId = selectedStylists[serviceId];

          if (!stylistId) {
            toast.error(`Please select a stylist for ${service.name}`);

            setIsSaving(false);

            return null;
          }
          const bookingEndTime = addMinutes(currentStartTime, service.duration);
          const { error: bookingError } = await supabase
            .from("bookings")
            .insert({
              appointment_id: appointmentId,
              service_id: serviceId,
              package_id: packageId,
              employee_id: stylistId,
              start_time: currentStartTime.toISOString(),
              end_time: bookingEndTime.toISOString(),
              status,
              price_paid: service.selling_price,
            });

          if (bookingError) {
            console.error("Error inserting package booking:", bookingError);
            throw bookingError;
          }
          currentStartTime = bookingEndTime;
        }
      }
      setIsSaving(false);
      return appointmentId;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
      setSaveError(error.message || "Failed to save appointment");
      setIsSaving(false);
      return null;
    }
  }, [
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
    discountType,
    discountValue,
    paymentMethod,
    notes,
  ]);

  return { handleSaveAppointment, isSaving, saveError };
};

export default useSaveAppointment;
