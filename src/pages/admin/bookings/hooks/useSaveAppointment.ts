
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Service, Package } from "../types";

export interface UseSaveAppointmentProps {
  selectedDate: Date | null;
  selectedTime: string;
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  selectedStylists: Record<string, string>;
  getTotalDuration: (services: Service[], packages: Package[]) => number;
  getTotalPrice: (services: Service[], packages: Package[], discountType: string, discountValue: number) => number;
  customizedServices: Record<string, string[]>;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  paymentMethod: string;
  notes: string;
  currentScreen?: string;
  locationId?: string;
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
  customizedServices,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  locationId
}: UseSaveAppointmentProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleSaveAppointment = async (additionalParams: {
    appliedTaxId?: string | null;
    taxAmount?: number;
    couponId?: string | null;
    couponDiscount?: number;
    couponName?: string;
    membershipId?: string | null;
    membershipName?: string | null;
    membershipDiscount?: number;
    total?: number;
    adjustedPrices?: Record<string, number>;
  } = {}) => {
    if (!selectedDate || !selectedCustomer) {
      toast.error("Date and customer are required");
      return null;
    }

    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return null;
    }

    try {
      setIsCreating(true);

      // Format the appointment date and time
      const appointmentDate = format(selectedDate, "yyyy-MM-dd");
      const [hours, minutes] = selectedTime.split(":").map(Number);

      // Create a new Date object for the start time
      const startTime = new Date(appointmentDate);
      startTime.setHours(hours, minutes, 0, 0);

      // Calculate the total duration for all services and packages
      const totalDuration = getTotalDuration(services, packages);
      
      // Calculate the end time by adding the total duration (in minutes)
      const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000);

      // Calculate the total price
      const totalPrice = additionalParams.total || getTotalPrice(
        services,
        packages,
        discountType,
        discountValue
      );

      // Get membership information from the customer if available or from params
      let membershipDiscount = additionalParams.membershipDiscount || 0;
      let membershipId = additionalParams.membershipId || null;
      let membershipName = additionalParams.membershipName || null;

      // Check if customer has active membership if not provided in additionalParams
      if (selectedCustomer.membership && !membershipId) {
        membershipId = selectedCustomer.membership.membership_id;
        membershipName = selectedCustomer.membership.name;
        membershipDiscount = selectedCustomer.membership.discount_value || 0;
      }

      // Create the appointment in the database
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_id: selectedCustomer.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_price: totalPrice,
          total_duration: totalDuration,
          number_of_bookings: selectedServices.length + selectedPackages.length,
          status: "confirmed",
          discount_type: discountType,
          discount_value: discountValue,
          payment_method: paymentMethod,
          notes: notes,
          location: locationId,
          // Adding the membership fields from params or customer data
          membership_discount: membershipDiscount,
          membership_id: membershipId,
          membership_name: membershipName,
          // Adding tax fields from params
          tax_amount: additionalParams.taxAmount || 0,
          tax_id: additionalParams.appliedTaxId || null,
          // Adding coupon fields from params
          coupon_id: additionalParams.couponId || null,
          // Adding transaction type for proper categorization
          transaction_type: 'sale',
          // Setting original_total_price for potential refund calculations
          original_total_price: totalPrice
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Now, create bookings for each selected service and package
      const bookingPromises = [];
  
      // Create bookings for services
      for (const serviceId of selectedServices) {
        const service = services.find((s) => s.id === serviceId);
        if (!service) continue;
        
        const employeeId = selectedStylists[serviceId];
        const startServiceTime = new Date(startTime); // Clone the date

        // Use adjusted price if available from params
        const price = additionalParams.adjustedPrices?.[serviceId] || service.selling_price || 0;

        const bookingPromise = supabase.from("bookings").insert({
          appointment_id: appointment.id,
          service_id: serviceId,
          employee_id: employeeId,
          price_paid: price,
          original_price: service.selling_price || price,
          start_time: startServiceTime.toISOString(),
          end_time: new Date(
            startServiceTime.getTime() + service.duration * 60 * 1000
          ).toISOString(),
        });

        bookingPromises.push(bookingPromise);
      }

      // Create bookings for packages
      for (const packageId of selectedPackages) {
        const pkg = packages.find((p) => p.id === packageId);
        if (!pkg) continue;

        const employeeId = selectedStylists[packageId];
        const packagePrice = pkg.price || 0;

        // Create main package booking
        const packageBookingPromise = supabase.from("bookings").insert({
          appointment_id: appointment.id,
          package_id: packageId,
          employee_id: employeeId,
          price_paid: packagePrice,
          original_price: packagePrice,
        });

        bookingPromises.push(packageBookingPromise);

        // For each service in the package, create a booking
        if (pkg.package_services) {
          for (const packageService of pkg.package_services) {
            const service = packageService.service;
            const serviceId = service.id;
            const serviceEmployeeId = selectedStylists[serviceId] || employeeId;
            const servicePrice = packageService.package_selling_price || service.selling_price || 0;
            
            const serviceBookingPromise = supabase.from("bookings").insert({
              appointment_id: appointment.id,
              service_id: serviceId,
              package_id: packageId,
              employee_id: serviceEmployeeId,
              price_paid: 0, // Price is already accounted for in the package booking
              original_price: servicePrice,
            });
            
            bookingPromises.push(serviceBookingPromise);
          }
        }

        // For customized services (services added to the package beyond the default ones)
        if (pkg.is_customizable && customizedServices[packageId]) {
          for (const customServiceId of customizedServices[packageId]) {
            // Check if this service is not already part of the package
            if (!pkg.package_services?.some(ps => ps.service.id === customServiceId)) {
              const customService = services.find((s) => s.id === customServiceId);
              if (!customService) continue;
              
              const customServiceEmployeeId = selectedStylists[customServiceId] || employeeId;
              // Use adjusted price if available from params
              const customServicePrice = additionalParams.adjustedPrices?.[customServiceId] || customService.selling_price || 0;
              
              const customServiceBookingPromise = supabase.from("bookings").insert({
                appointment_id: appointment.id,
                service_id: customServiceId,
                package_id: packageId,
                employee_id: customServiceEmployeeId,
                price_paid: customServicePrice,
                original_price: customService.selling_price || customServicePrice,
              });
              
              bookingPromises.push(customServiceBookingPromise);
            }
          }
        }
      }

      // Execute all booking promises
      await Promise.all(bookingPromises);

      // Invalidate appointments query cache to trigger a rerender with latest data
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['appointments', formattedDate, locationId] });

      toast.success(
        "Appointment created successfully. Don't forget to confirm it with the customer."
      );
      
      return appointment.id;
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast.error(`Error creating appointment: ${error.message}`);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { handleSaveAppointment, isCreating };
};

export default useSaveAppointment;
