
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SCREEN, PaymentMethod, DiscountType, AppointmentStatus } from "../types";

interface SaveAppointmentProps {
  selectedDate: Date;
  selectedTime: string;
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: any[];
  packages: any[];
  selectedStylists: Record<string, string>;
  getTotalDuration: (services: any[], packages: any[]) => number;
  getTotalPrice: (
    services: any[],
    packages: any[],
    discountType: string,
    discountValue: number
  ) => number;
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  notes: string;
  customizedServices: Record<string, string[]>;
  currentScreen: SCREEN;
  locationId?: string;
  status?: AppointmentStatus; // Add status parameter
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
  currentScreen,
  locationId,
  status = "pending", // Default to pending if not provided
}: SaveAppointmentProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveAppointment = async () => {
    try {
      setIsLoading(true);

      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }

      const totalDuration = getTotalDuration(services, packages);

      // Format date and time
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);

      // Calculate end time
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + totalDuration);

      const startTimeString = startDate.toISOString();
      const endTimeString = endDate.toISOString();

      const totalPrice = getTotalPrice(
        services,
        packages,
        discountType,
        discountValue
      );

      // Calculate discounted price
      let discountAmount = 0;
      if (discountType === "percentage") {
        discountAmount = (totalPrice * discountValue) / 100;
      } else if (discountType === "fixed") {
        discountAmount = discountValue;
      }

      const finalPrice = totalPrice - discountAmount;

      // For simplicity, use a fixed tax rate
      const taxRate = 0.09;
      const taxAmount = totalPrice * taxRate;

      const appointment = {
        customer_id: selectedCustomer.id,
        start_time: startTimeString,
        end_time: endTimeString,
        status: status, // Use the provided status
        discount_type: discountType,
        discount_value: discountValue,
        total_price: finalPrice + taxAmount,
        payment_method: paymentMethod,
        notes: notes,
        tax_amount: taxAmount,
        location: locationId,
      };

      const { data: appointmentData, error } = await supabase
        .from("appointments")
        .insert(appointment)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const appointmentId = appointmentData.id;

      if (selectedServices.length === 0 && selectedPackages.length === 0) {
        toast.error("Please select at least one service or package");
        return;
      }

      // Add bookings for individual services
      let servicePromises = selectedServices.map(async (serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        if (!service) return;

        const serviceStartDate = new Date(startDate);
        const serviceEndDate = new Date(serviceStartDate);
        serviceEndDate.setMinutes(
          serviceEndDate.getMinutes() + service.duration
        );

        const booking = {
          appointment_id: appointmentId,
          service_id: serviceId,
          employee_id: selectedStylists[serviceId] || null,
          start_time: serviceStartDate.toISOString(),
          end_time: serviceEndDate.toISOString(),
          status: status === "inprogress" ? "pending" : status, // Map inprogress to pending for bookings if needed
          price: service.selling_price,
          price_paid: currentScreen === SCREEN.CHECKOUT ? service.selling_price : 0,
        };

        await supabase.from("bookings").insert(booking);
      });

      // Add bookings for packages
      let packagePromises = selectedPackages.map(async (packageId) => {
        const pkg = packages.find((p) => p.id === packageId);
        if (!pkg) return;

        // Add base package booking
        const packageBooking = {
          appointment_id: appointmentId,
          package_id: packageId,
          employee_id: selectedStylists[packageId] || null,
          start_time: startTimeString,
          end_time: endTimeString,
          status: status === "inprogress" ? "pending" : status, // Map inprogress to pending
          price: pkg.price,
          price_paid: currentScreen === SCREEN.CHECKOUT ? pkg.price : 0,
        };

        await supabase.from("bookings").insert(packageBooking);

        // Add bookings for each service in the package
        if (pkg.package_services && pkg.package_services.length > 0) {
          let packageServicePromises = pkg.package_services.map(
            async (packageService: any) => {
              const service = packageService.service;

              const serviceBooking = {
                appointment_id: appointmentId,
                service_id: service.id,
                package_id: packageId,
                employee_id: selectedStylists[packageId] || null,
                start_time: startTimeString,
                end_time: endTimeString,
                status: status === "inprogress" ? "pending" : status, // Map inprogress to pending
                price: 0, // Part of package, so price is 0
                price_paid: 0,
              };

              await supabase.from("bookings").insert(serviceBooking);
            }
          );

          await Promise.all(packageServicePromises);
        }

        // Add custom services if any
        const customServices = customizedServices[packageId] || [];
        if (customServices.length > 0) {
          let customServicePromises = customServices.map(async (serviceId) => {
            const service = services.find((s) => s.id === serviceId);
            if (!service) return;

            const customServiceBooking = {
              appointment_id: appointmentId,
              service_id: serviceId,
              package_id: packageId,
              employee_id: selectedStylists[packageId] || null,
              start_time: startTimeString,
              end_time: endTimeString,
              status: status === "inprogress" ? "pending" : status, // Map inprogress to pending
              price: service.selling_price,
              price_paid:
                currentScreen === SCREEN.CHECKOUT ? service.selling_price : 0,
            };

            await supabase.from("bookings").insert(customServiceBooking);
          });

          await Promise.all(customServicePromises);
        }
      });

      await Promise.all([...servicePromises, ...packagePromises]);

      toast.success(
        currentScreen === SCREEN.CHECKOUT
          ? "Payment completed successfully"
          : "Appointment saved successfully"
      );

      return appointmentId;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return { handleSaveAppointment, isLoading };
};

export default useSaveAppointment;
