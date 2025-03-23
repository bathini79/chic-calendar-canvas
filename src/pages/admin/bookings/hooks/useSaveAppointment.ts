
import { useState } from "react";
import { format, addMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "../types";
import { toast } from "sonner";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { getFinalPrice } from "../utils/bookingUtils";

interface UseSaveAppointmentProps {
  selectedDate: Date;
  selectedTime: string;
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  services: any[];
  packages: any[];
  selectedStylists: Record<string, string>;
  getTotalDuration: (
    services: any[],
    packages: any[]
  ) => number;
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
  customizedServices: Record<string, string[]>;
  currentScreen: string;
  locationId?: string;
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
  getTotalDuration,
  getTotalPrice,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  customizedServices,
  currentScreen,
  locationId,
}: UseSaveAppointmentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { customerMemberships, getApplicableMembershipDiscount } = useCustomerMemberships();
  
  const handleSaveAppointment = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    setIsLoading(true);

    try {
      // Calculate total duration
      const totalDuration = getTotalDuration(
        selectedServices.map(
          (serviceId) => services.find((s) => s.id === serviceId) || {}
        ),
        selectedPackages.map(
          (packageId) => packages.find((p) => p.id === packageId) || {}
        )
      );

      // Calculate original total price before discounts
      const originalTotalPrice = getTotalPrice(
        selectedServices.map(
          (serviceId) => services.find((s) => s.id === serviceId) || {}
        ),
        selectedPackages.map(
          (packageId) => packages.find((p) => p.id === packageId) || {}
        ),
        "none",
        0
      );

      // Calculate total price after manual discount
      const totalPrice = getTotalPrice(
        selectedServices.map(
          (serviceId) => services.find((s) => s.id === serviceId) || {}
        ),
        selectedPackages.map(
          (packageId) => packages.find((p) => p.id === packageId) || {}
        ),
        discountType,
        discountValue
      );
      
      // Get membership discount if available
      let membershipDiscount = 0;
      let membershipId = null;
      let membershipName = null;
      
      // Check for the best membership discount across all selected items
      let bestDiscount = 0;
      let bestMembershipDiscount = null;
      
      // Check services first
      selectedServices.forEach(serviceId => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          const discount = getApplicableMembershipDiscount(serviceId, null, service.selling_price);
          if (discount && discount.calculatedDiscount > bestDiscount) {
            bestDiscount = discount.calculatedDiscount;
            bestMembershipDiscount = discount;
          }
        }
      });
      
      // Then check packages
      selectedPackages.forEach(packageId => {
        const pkg = packages.find(p => p.id === packageId);
        if (pkg) {
          const discount = getApplicableMembershipDiscount(null, packageId, pkg.price);
          if (discount && discount.calculatedDiscount > bestDiscount) {
            bestDiscount = discount.calculatedDiscount;
            bestMembershipDiscount = discount;
          }
        }
      });
      
      // If we found a membership discount, apply it
      if (bestMembershipDiscount) {
        membershipDiscount = bestMembershipDiscount.calculatedDiscount;
        membershipId = bestMembershipDiscount.membershipId;
        membershipName = bestMembershipDiscount.membershipName;
      }

      // Convert selectedDate and selectedTime to a UTC date object
      const startDate = new Date(
        `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`
      );

      // Calculate end time by adding totalDuration minutes to startDate
      const endDate = addMinutes(startDate, totalDuration);

      // Create the appointment
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_id: selectedCustomer.id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          status: currentScreen === "CHECKOUT" ? "confirmed" : "booked",
          total_price: totalPrice - membershipDiscount,
          original_total_price: originalTotalPrice,
          discount_type: discountType,
          discount_value: discountValue,
          payment_method: paymentMethod,
          notes: notes,
          total_duration: totalDuration,
          transaction_type: currentScreen === "CHECKOUT" ? "sale" : "booking",
          membership_id: membershipId,
          membership_name: membershipName,
          membership_discount: membershipDiscount,
          location: locationId,
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      const appointmentId = appointmentData.id;

      // Create bookings for each service
      for (const serviceId of selectedServices) {
        const service = services.find((s) => s.id === serviceId);
        if (!service) continue;

        const { error: bookingError } = await supabase.from("bookings").insert({
          appointment_id: appointmentId,
          service_id: serviceId,
          price_paid: service.selling_price,
          original_price: service.original_price,
          employee_id: selectedStylists[serviceId] || null,
          status: currentScreen === "CHECKOUT" ? "confirmed" : "booked",
          start_time: selectedTime
            ? new Date(
                `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`
              ).toISOString()
            : null,
          end_time: selectedTime
            ? new Date(
                `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`
              ).toISOString()
            : null,
        });

        if (bookingError) throw bookingError;
      }

      // Create bookings for each package
      for (const packageId of selectedPackages) {
        const pkg = packages.find((p) => p.id === packageId);
        if (!pkg) continue;

        // Create booking for the package
        const { data: packageBookingData, error: packageBookingError } =
          await supabase
            .from("bookings")
            .insert({
              appointment_id: appointmentId,
              package_id: packageId,
              price_paid: pkg.price,
              employee_id: selectedStylists[packageId] || null,
              status: currentScreen === "CHECKOUT" ? "confirmed" : "booked",
              start_time: selectedTime
                ? new Date(
                    `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`
                  ).toISOString()
                : null,
              end_time: selectedTime
                ? new Date(
                    `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`
                  ).toISOString()
                : null,
            })
            .select()
            .single();

        if (packageBookingError) throw packageBookingError;

        // Add services included in the package
        if (pkg.package_services && pkg.package_services.length > 0) {
          for (const packageService of pkg.package_services) {
            const { error: serviceBookingError } = await supabase
              .from("bookings")
              .insert({
                appointment_id: appointmentId,
                service_id: packageService.service.id,
                package_id: packageId,
                price_paid: 0, // Price already paid as part of the package
                employee_id: selectedStylists[packageId] || null,
                status: currentScreen === "CHECKOUT" ? "confirmed" : "booked",
                start_time: selectedTime
                  ? new Date(
                      `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`
                    ).toISOString()
                  : null,
                end_time: selectedTime
                  ? new Date(
                      `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`
                    ).toISOString()
                  : null,
              });

            if (serviceBookingError) throw serviceBookingError;
          }
        }

        // Add customized services for the package if it's customizable
        if (
          pkg.is_customizable &&
          customizedServices[packageId] &&
          customizedServices[packageId].length > 0
        ) {
          for (const customServiceId of customizedServices[packageId]) {
            const customService = services.find(
              (s) => s.id === customServiceId
            );
            if (!customService) continue;

            const { error: customServiceBookingError } = await supabase
              .from("bookings")
              .insert({
                appointment_id: appointmentId,
                service_id: customServiceId,
                package_id: packageId,
                price_paid: customService.selling_price,
                employee_id: selectedStylists[packageId] || null,
                status: currentScreen === "CHECKOUT" ? "confirmed" : "booked",
                start_time: selectedTime
                  ? new Date(
                      `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`
                    ).toISOString()
                  : null,
                end_time: selectedTime
                  ? new Date(
                      `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`
                    ).toISOString()
                  : null,
              });

            if (customServiceBookingError) throw customServiceBookingError;
          }
        }
      }
      
      // Create transaction record if this is a completed sale
      if (currentScreen === "CHECKOUT") {
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            customer_id: selectedCustomer.id,
            amount: totalPrice - membershipDiscount,
            tax_amount: 0, // You would need to add tax calculation if needed
            payment_method: paymentMethod,
            transaction_type: "appointment_sale",
            item_id: appointmentId,
            item_type: "appointment"
          });

        if (transactionError) throw transactionError;
      }

      toast.success(
        currentScreen === "CHECKOUT"
          ? "Payment completed successfully"
          : "Appointment booked successfully"
      );

      return appointmentId;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(`Error: ${error.message}`);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return { handleSaveAppointment, isLoading };
}
