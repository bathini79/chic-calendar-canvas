
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";
import { generateTimeSlots } from "../utils/timeUtils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UseSaveAppointmentProps {
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
  discountType: string;
  discountValue: number;
  paymentMethod: string;
  notes: string;
  customizedServices: Record<string, string[]>;
  currentScreen: string;
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
  discountType,
  discountValue,
  paymentMethod,
  notes,
  customizedServices,
  currentScreen,
  locationId
}: UseSaveAppointmentProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSaveAppointment = async () => {
    try {
      setIsLoading(true);

      if (!selectedCustomer || !selectedDate) {
        toast.error("Customer and date are required to save appointment");
        return null;
      }

      if (selectedServices.length === 0 && selectedPackages.length === 0) {
        toast.error("At least one service or package must be selected");
        return null;
      }

      const duration = getTotalDuration(services, packages);
      const basePrice = getTotalPrice(services, packages, 'none', 0); // Get base price without discounts

      // Calculate discount amount
      let discountAmount = 0;
      if (discountType === 'percentage' && discountValue > 0) {
        discountAmount = (basePrice * discountValue) / 100;
      } else if (discountType === 'fixed' && discountValue > 0) {
        discountAmount = discountValue;
      }

      // Calculate price after discount
      const priceAfterDiscount = basePrice - discountAmount;

      // Format the start and end times
      const startTime = `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`;
      const startDate = new Date(startTime);

      // Calculate end time by adding duration
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
      const endTime = endDate.toISOString();

      // Check for overlapping appointments
      const { data: overlappingAppointments } = await supabase
        .from("bookings")
        .select("id, employee_id, start_time, end_time")
        .filter("employee_id", "in", `(${Object.values(selectedStylists).join(",")})`)
        .filter("status", "not.in", `('canceled','refunded')`)
        .lte("start_time", endTime)
        .gte("end_time", startTime);

      if (overlappingAppointments && overlappingAppointments.length > 0) {
        const clashingEmployeeIds = overlappingAppointments.map((a) => a.employee_id);
        const clashingEmployeeNames = Object.entries(selectedStylists)
          .filter(([_, employeeId]) => clashingEmployeeIds.includes(employeeId))
          .map(([serviceId, _]) => {
            const service = services.find((s) => s.id === serviceId);
            return service ? service.name : "Unknown service";
          });

        toast.error(
          `Time slot already booked for: ${clashingEmployeeNames.join(", ")}`
        );
        return null;
      }

      // Get membership information if any
      // We'll assume this is handled through some other context or state
      // For now, setting defaults
      const membershipDiscount = 0;
      const membershipId = null;
      const membershipName = null;

      // Start creating the appointment
      const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
          customer_id: selectedCustomer.id,
          start_time: startTime,
          end_time: endTime,
          total_price: priceAfterDiscount,
          original_total_price: basePrice, // Store original price before discounts
          total_duration: duration,
          notes: notes,
          status: "booked",
          discount_type: discountType,
          discount_value: discountValue,
          payment_method: paymentMethod,
          location: locationId,
          number_of_bookings: selectedServices.length + selectedPackages.length,
          transaction_type: "sale",
          // Add membership fields
          membership_discount: membershipDiscount,
          membership_id: membershipId,
          membership_name: membershipName
        })
        .select()
        .single();

      if (error) {
        toast.error(`Error creating appointment: ${error.message}`);
        return null;
      }

      const appointmentId = appointment.id;
      if (!appointmentId) {
        toast.error("Failed to create appointment, no ID returned");
        return null;
      }

      // Create bookings
      const bookings = [];

      // Create service bookings
      for (const serviceId of selectedServices) {
        const service = services.find((s) => s.id === serviceId);
        if (!service) continue;

        const stylistId = selectedStylists[serviceId];
        if (!stylistId) {
          toast.error(`No stylist selected for service: ${service.name}`);
          continue;
        }

        // Calculate service times
        const serviceStartTime = startTime;
        const serviceDuration = service.duration;
        const serviceEndTime = new Date(
          new Date(serviceStartTime).getTime() + serviceDuration * 60 * 1000
        ).toISOString();

        bookings.push({
          appointment_id: appointmentId,
          service_id: serviceId,
          employee_id: stylistId,
          start_time: serviceStartTime,
          end_time: serviceEndTime,
          price: service.selling_price,
          price_paid: service.selling_price,
          original_price: service.original_price || service.selling_price,
          status: "booked"
        });
      }

      // Create package bookings
      for (const packageId of selectedPackages) {
        const pkg = packages.find((p) => p.id === packageId);
        if (!pkg) continue;

        const stylistId = selectedStylists[packageId];
        
        if (!stylistId) {
          toast.error(`No stylist selected for package: ${pkg.name}`);
          continue;
        }

        // For package header booking (main package entry)
        // Use a standardized approach for package booking
        const packageStartTime = startTime;
        const packageDuration = pkg.duration;
        const packageEndTime = new Date(
          new Date(packageStartTime).getTime() + packageDuration * 60 * 1000
        ).toISOString();

        // First add the main package booking
        bookings.push({
          appointment_id: appointmentId,
          package_id: packageId,
          employee_id: stylistId,
          start_time: packageStartTime,
          end_time: packageEndTime,
          price: pkg.price,
          price_paid: pkg.price,
          original_price: pkg.price,
          status: "booked"
        });

        // Then add bookings for each service in the package
        if (pkg.package_services && pkg.package_services.length > 0) {
          pkg.package_services.forEach((ps) => {
            bookings.push({
              appointment_id: appointmentId,
              service_id: ps.service_id,
              package_id: packageId,
              employee_id: stylistId,
              start_time: packageStartTime,
              end_time: packageEndTime, 
              price: ps.package_selling_price || ps.service?.selling_price || 0,
              price_paid: 0, // Price is covered by the package price
              original_price: ps.service?.original_price || ps.service?.selling_price || 0,
              status: "booked"
            });
          });
        }

        // Add any customized services for this package
        const customizedServiceIds = customizedServices[packageId] || [];
        if (customizedServiceIds.length > 0) {
          for (const serviceId of customizedServiceIds) {
            const service = services.find((s) => s.id === serviceId);
            if (!service) continue;

            bookings.push({
              appointment_id: appointmentId,
              service_id: serviceId,
              package_id: packageId,
              employee_id: stylistId,
              start_time: packageStartTime,
              end_time: packageEndTime,
              price: service.selling_price,
              price_paid: service.selling_price, // This is charged extra
              original_price: service.original_price || service.selling_price,
              status: "booked"
            });
          }
        }
      }

      // Insert all bookings
      const { error: bookingError } = await supabase
        .from("bookings")
        .insert(bookings);

      if (bookingError) {
        toast.error(`Error creating bookings: ${bookingError.message}`);
        return null;
      }
      
      // Invalidate the appointments query to refresh the TimeSlots component
      queryClient.invalidateQueries({ 
        queryKey: ['appointments', format(selectedDate, 'yyyy-MM-dd'), locationId] 
      });
      
      toast.success("Appointment saved successfully");
      return appointmentId;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { handleSaveAppointment, isLoading };
};

export default useSaveAppointment;
