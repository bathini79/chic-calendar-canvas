
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";
import { toast } from "sonner";
import { SCREEN } from "../types";

// Function to generate start and end times given a start time and duration
const generateTimesForItem = (
  startTime: Date,
  duration: number
): { start: Date; end: Date } => {
  const endTime = new Date(startTime.getTime());
  endTime.setMinutes(endTime.getMinutes() + duration);
  return { start: startTime, end: endTime };
};

interface UseSaveAppointmentProps {
  selectedDate?: Date;
  selectedTime?: string;
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  services: any[];
  packages: any[];
  customizedServices: Record<string, string[]>;
  getTotalDuration: (services: any[], packages: any[]) => number;
  getTotalPrice: (
    services: any[],
    packages: any[],
    discountType: string,
    discountValue: number
  ) => number;
  discountType: string;
  discountValue: number;
  paymentMethod: string;
  notes: string;
  locationId?: string;
  currentScreen: string;
  membershipId?: string;
}

export default function useSaveAppointment({
  selectedDate,
  selectedTime,
  selectedCustomer,
  selectedServices,
  selectedPackages,
  services,
  packages,
  selectedStylists,
  customizedServices,
  getTotalDuration,
  getTotalPrice,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  locationId,
  currentScreen,
  membershipId
}: UseSaveAppointmentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveAppointment = async (params?: any) => {
    if (!selectedCustomer || (!selectedServices.length && !selectedPackages.length)) {
      toast.error("Please select a customer and at least one service");
      return null;
    }

    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return null;
    }

    const existingAppointmentId = params?.appointmentId;
    setIsLoading(true);

    try {
      const [hours, minutes] = selectedTime.split(":").map(Number);

      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, minutes, 0, 0);

      const totalDuration = getTotalDuration(services, packages);
      const endTime = new Date(appointmentDate.getTime() + totalDuration * 60000);

      const totalPrice = getTotalPrice(services, packages, discountType, discountValue);
      
      // Gather additional data from params if available
      const taxId = params?.appliedTaxId || null;
      const taxAmount = params?.taxAmount || 0;
      const couponId = params?.couponId || null;
      const couponDiscount = params?.couponDiscount || 0;
      const finalTotal = params?.total || totalPrice;

      // Create or update appointment
      let appointmentId;

      if (existingAppointmentId) {
        // Update existing appointment
        const { data, error } = await supabase
          .from("appointments")
          .update({
            customer_id: selectedCustomer.id,
            start_time: appointmentDate.toISOString(),
            end_time: endTime.toISOString(),
            notes: notes,
            status: 'booked',
            number_of_bookings: selectedServices.length + selectedPackages.length,
            total_price: finalTotal,
            total_duration: totalDuration,
            discount_type: discountType,
            discount_value: discountValue,
            payment_method: paymentMethod,
            tax_id: taxId,
            tax_amount: taxAmount,
            coupon_id: couponId,
            location_id: locationId
          })
          .eq("id", existingAppointmentId)
          .select();

        if (error) throw error;
        appointmentId = existingAppointmentId;

        // Delete existing bookings to recreate them
        const { error: deleteError } = await supabase
          .from("bookings")
          .delete()
          .eq("appointment_id", appointmentId);

        if (deleteError) throw deleteError;
      } else {
        // Create new appointment
        const { data, error } = await supabase
          .from("appointments")
          .insert({
            customer_id: selectedCustomer.id,
            start_time: appointmentDate.toISOString(),
            end_time: endTime.toISOString(),
            notes: notes,
            status: 'booked',
            number_of_bookings: selectedServices.length + selectedPackages.length,
            total_price: finalTotal,
            total_duration: totalDuration,
            discount_type: discountType,
            discount_value: discountValue,
            payment_method: paymentMethod,
            tax_id: taxId,
            tax_amount: taxAmount,
            coupon_id: couponId,
            location_id: locationId,
            membership_id: membershipId
          })
          .select();

        if (error) throw error;
        appointmentId = data[0].id;
      }

      // Create bookings for individual services
      let currentTime = new Date(appointmentDate);
      
      for (const serviceId of selectedServices) {
        const service = services.find((s) => s.id === serviceId);
        if (!service) continue;

        const stylistId = selectedStylists[serviceId] || null;
        const serviceDuration = service.duration || 0;
        const { start, end } = generateTimesForItem(currentTime, serviceDuration);

        const { error } = await supabase.from("bookings").insert({
          appointment_id: appointmentId,
          service_id: serviceId,
          employee_id: stylistId,
          status: currentScreen === SCREEN.CHECKOUT ? "confirmed" : "booked",
          price_paid: service.selling_price,
          original_price: service.original_price,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        });

        if (error) throw error;
        currentTime = end;
      }

      // Create bookings for packages
      for (const packageId of selectedPackages) {
        const pkg = packages.find((p) => p.id === packageId);
        if (!pkg) continue;

        const packageStylistId = selectedStylists[packageId] || null;
        let packageStartTime = new Date(currentTime);

        if (pkg.package_services && pkg.package_services.length > 0) {
          for (const packageService of pkg.package_services) {
            const stylistId = selectedStylists[packageService.service.id] || packageStylistId || null;
            const serviceDuration = packageService.service.duration || 0;
            const { start, end } = generateTimesForItem(packageStartTime, serviceDuration);

            const servicePriceInPackage = 
              packageService.package_selling_price !== undefined && 
              packageService.package_selling_price !== null
                ? packageService.package_selling_price
                : packageService.service.selling_price;

            const { error } = await supabase.from("bookings").insert({
              appointment_id: appointmentId,
              service_id: packageService.service.id,
              package_id: packageId,
              employee_id: stylistId,
              status: currentScreen === SCREEN.CHECKOUT ? "confirmed" : "booked",
              price_paid: servicePriceInPackage,
              original_price: packageService.service.original_price,
              start_time: start.toISOString(),
              end_time: end.toISOString(),
            });

            if (error) throw error;
            packageStartTime = end;
          }
        }

        // Add customized services if any
        if (
          customizedServices[packageId] &&
          customizedServices[packageId].length > 0
        ) {
          for (const serviceId of customizedServices[packageId]) {
            const service = services.find((s) => s.id === serviceId);
            if (!service) continue;

            const stylistId = selectedStylists[serviceId] || packageStylistId || null;
            const serviceDuration = service.duration || 0;
            const { start, end } = generateTimesForItem(packageStartTime, serviceDuration);

            const { error } = await supabase.from("bookings").insert({
              appointment_id: appointmentId,
              service_id: serviceId,
              package_id: packageId,
              employee_id: stylistId,
              status: currentScreen === SCREEN.CHECKOUT ? "confirmed" : "booked",
              price_paid: service.selling_price,
              original_price: service.original_price,
              start_time: start.toISOString(),
              end_time: end.toISOString(),
            });

            if (error) throw error;
            packageStartTime = end;
          }
        }

        currentTime = packageStartTime;
      }

      if (currentScreen === SCREEN.CHECKOUT) {
        toast.success("Appointment and payment saved successfully");
      } else {
        toast.success("Appointment saved successfully");
      }

      return appointmentId;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(`Error saving appointment: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { handleSaveAppointment, isLoading };
}
