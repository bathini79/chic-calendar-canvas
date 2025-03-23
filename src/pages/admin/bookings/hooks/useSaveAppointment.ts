
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatISO } from "date-fns";
import { SCREEN } from "../types";

export default function useSaveAppointment({
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
  currentScreen,
  locationId
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAppointment = async (params = {}) => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return null;
    }

    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return null;
    }

    setIsSaving(true);

    try {
      // Convert time string to Date object
      const [hours, minutes] = selectedTime.split(":");
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Calculate total duration and end time
      const totalDuration = getTotalDuration(services, packages);
      const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60 * 1000);

      const totalPrice = getTotalPrice(services, packages, discountType, discountValue);

      // Check if we're updating or creating an appointment
      const isUpdate = params.appointmentId || false;
      
      // Use any tax data passed in the params
      const taxId = params.appliedTaxId || null;
      const taxAmount = params.taxAmount || 0;
      const couponId = params.couponId || null;
      const couponDiscount = params.couponDiscount || 0;
      const membershipId = params.membershipId || null;
      const membershipDiscount = params.membershipDiscount || 0;
      const membershipName = params.membershipName || null;
      
      const total = currentScreen === SCREEN.CHECKOUT && params.total 
        ? params.total 
        : totalPrice;

      // Format date strings for Supabase
      const startTimeISO = formatISO(startDateTime);
      const endTimeISO = formatISO(endDateTime);

      // Create or update the appointment
      let appointmentId = params.appointmentId;
      
      if (!isUpdate) {
        // Create new appointment
        const { data: appointmentData, error: appointmentError } = await supabase
          .from("appointments")
          .insert({
            customer_id: selectedCustomer.id,
            start_time: startTimeISO,
            end_time: endTimeISO,
            status: currentScreen === SCREEN.CHECKOUT ? "confirmed" : "booked",
            total_price: total,
            discount_type: discountType,
            discount_value: discountValue,
            payment_method: paymentMethod,
            notes: notes,
            location: locationId,
            total_duration: totalDuration,
            number_of_bookings: selectedServices.length + selectedPackages.length,
            tax_amount: taxAmount,
            coupon_id: couponId,
            membership_id: membershipId,
            membership_discount: membershipDiscount,
            membership_name: membershipName
          })
          .select()
          .single();

        if (appointmentError) throw appointmentError;
        appointmentId = appointmentData.id;
      } else {
        // Update existing appointment
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            start_time: startTimeISO,
            end_time: endTimeISO,
            status: currentScreen === SCREEN.CHECKOUT ? "confirmed" : "booked",
            total_price: total,
            discount_type: discountType,
            discount_value: discountValue,
            payment_method: paymentMethod,
            notes: notes,
            location: locationId,
            total_duration: totalDuration,
            number_of_bookings: selectedServices.length + selectedPackages.length,
            tax_amount: taxAmount,
            coupon_id: couponId,
            membership_id: membershipId,
            membership_discount: membershipDiscount,
            membership_name: membershipName
          })
          .eq("id", appointmentId);

        if (updateError) throw updateError;

        // Delete existing bookings for this appointment
        const { error: deleteError } = await supabase
          .from("bookings")
          .delete()
          .eq("appointment_id", appointmentId);

        if (deleteError) throw deleteError;
      }

      // Create bookings for selected services
      for (const serviceId of selectedServices) {
        const service = services.find((s) => s.id === serviceId);
        if (!service) continue;

        // Calculate service start and end times
        const serviceStart = selectedTime;
        const serviceEnd = new Date(
          startDateTime.getTime() + service.duration * 60 * 1000
        );

        const { error: bookingError } = await supabase.from("bookings").insert({
          appointment_id: appointmentId,
          service_id: serviceId,
          employee_id: selectedStylists[serviceId] || null,
          start_time: startTimeISO,
          end_time: formatISO(serviceEnd),
          price_paid: service.selling_price,
          status: currentScreen === SCREEN.CHECKOUT ? "confirmed" : "booked",
        });

        if (bookingError) throw bookingError;
      }

      // Create bookings for selected packages
      for (const packageId of selectedPackages) {
        const pkg = packages.find((p) => p.id === packageId);
        if (!pkg) continue;

        // Insert booking for the package
        const { data: packageBooking, error: packageError } = await supabase
          .from("bookings")
          .insert({
            appointment_id: appointmentId,
            package_id: packageId,
            employee_id: selectedStylists[packageId] || null,
            price_paid: pkg.price,
            start_time: startTimeISO,
            end_time: endTimeISO,
            status: currentScreen === SCREEN.CHECKOUT ? "confirmed" : "booked",
          })
          .select()
          .single();

        if (packageError) throw packageError;

        // Insert bookings for each service in the package
        if (pkg.package_services) {
          for (const packageService of pkg.package_services) {
            const serviceId = packageService.service.id;
            const { error: serviceBookingError } = await supabase
              .from("bookings")
              .insert({
                appointment_id: appointmentId,
                service_id: serviceId,
                package_id: packageId,
                employee_id: selectedStylists[serviceId] || selectedStylists[packageId] || null,
                price_paid: packageService.package_selling_price || packageService.service.selling_price,
                start_time: startTimeISO,
                end_time: endTimeISO,
                status: currentScreen === SCREEN.CHECKOUT ? "confirmed" : "booked",
              });

            if (serviceBookingError) throw serviceBookingError;
          }
        }

        // Add bookings for customized services in the package
        if (pkg.is_customizable && customizedServices[packageId]) {
          for (const serviceId of customizedServices[packageId]) {
            // Check if this service is already part of the base package
            const isBaseService = pkg.package_services?.some(ps => ps.service.id === serviceId);
            if (isBaseService) continue;

            const service = services.find(s => s.id === serviceId);
            if (!service) continue;

            const { error: customServiceError } = await supabase
              .from("bookings")
              .insert({
                appointment_id: appointmentId,
                service_id: serviceId,
                package_id: packageId,
                employee_id: selectedStylists[serviceId] || selectedStylists[packageId] || null,
                price_paid: service.selling_price,
                start_time: startTimeISO,
                end_time: endTimeISO,
                status: currentScreen === SCREEN.CHECKOUT ? "confirmed" : "booked",
              });

            if (customServiceError) throw customServiceError;
          }
        }
      }

      if (currentScreen === SCREEN.CHECKOUT) {
        toast.success("Payment completed successfully");
      } else {
        toast.success("Appointment saved successfully");
      }

      return appointmentId;
    } catch (error) {
      console.error("Error saving appointment:", error);
      toast.error(`Failed to save appointment: ${error.message}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    handleSaveAppointment,
    isSaving,
  };
}
