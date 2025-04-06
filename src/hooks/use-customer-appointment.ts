
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppointmentNotifications } from "./use-appointment-notifications";

export interface CustomerAppointmentProps {
  customerId: string;
  locationId: string;
  startTime: string;
  endTime: string;
  cartItems: any[];
  notes?: string;
  totalPrice: number;
}

export const useCustomerAppointment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { sendNotification } = useAppointmentNotifications();

  const createAppointment = async ({
    customerId,
    startTime,
    endTime,
    cartItems,
    locationId,
    notes = "",
    totalPrice
  }: CustomerAppointmentProps) => {
    try {
      setIsLoading(true);

      // Create the appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_id: customerId,
          start_time: startTime,
          end_time: endTime,
          location: locationId,
          notes,
          total_price: totalPrice,
          status: "booked",
          payment_method: "pending",
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Create the bookings for each item
      for (const item of cartItems) {
        const bookingData = {
          appointment_id: appointment.id,
          service_id: item.service_id || null,
          package_id: item.package_id || null,
          price_paid: item.selling_price,
          original_price: item.original_price || item.selling_price,
          status: "booked",
          start_time: startTime,
          // For simplicity, we're using the same end time for all services
          end_time: endTime,
        };

        const { error: bookingError } = await supabase
          .from("bookings")
          .insert(bookingData);

        if (bookingError) throw bookingError;
      }

      // Send WhatsApp notification
      try {
        await sendNotification(appointment.id, "BOOKING_CONFIRMATION");
      } catch (notificationError) {
        console.error("Failed to send booking notification:", notificationError);
        // Continue even if notification fails
      }

      return appointment.id;
    } catch (error: any) {
      console.error("Error booking appointment:", error);
      toast.error(error.message || "Failed to book appointment");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createAppointment,
    isLoading,
  };
};
