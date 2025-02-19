
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";
import { Customer } from "../types";

export function useAppointmentHandlers() {
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const handleSaveAppointment = async ({
    selectedDate,
    selectedTime,
    selectedCustomer,
    selectedServices,
    selectedStylists,
    services,
    getTotalDuration,
    getTotalPrice,
  }: {
    selectedDate: Date | undefined;
    selectedTime: string | undefined;
    selectedCustomer: Customer | null;
    selectedServices: string[];
    selectedStylists: Record<string, string>;
    services: any[] | undefined;
    getTotalDuration: () => number;
    getTotalPrice: () => number;
  }) => {
    if (!selectedDate || !selectedTime || !selectedCustomer) {
      toast.error("Please select a date, time and customer");
      return;
    }

    try {
      const startDateTime = new Date(`${format(selectedDate!, 'yyyy-MM-dd')} ${selectedTime}`);
      if (isNaN(startDateTime.getTime())) {
        console.error(`Invalid date generated, date: ${format(selectedDate!, 'yyyy-MM-dd')}, time: ${selectedTime}`);
        return;
      }
      
      const totalDuration = getTotalDuration();
      const endDateTime = addMinutes(startDateTime, totalDuration);
      const totalPrice = getTotalPrice();

      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          customer_id: selectedCustomer.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'confirmed',
          number_of_bookings: selectedServices.length,
          total_price: totalPrice,
          original_total_price: totalPrice,
          total_duration: totalDuration
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      const appointmentId = appointmentData.id;
      setCurrentAppointmentId(appointmentId);

      for (const serviceId of selectedServices) {
        const service = services?.find(s => s.id === serviceId);
        if (!service) continue;

        const bookingStartTime = startDateTime;
        const bookingEndTime = addMinutes(startDateTime, service.duration);

        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            appointment_id: appointmentId,
            service_id: serviceId,
            employee_id: selectedStylists[serviceId],
            start_time: bookingStartTime.toISOString(),
            end_time: bookingEndTime.toISOString(),
            price_paid: service.selling_price,
            status: 'confirmed'
          });

        if (bookingError) throw bookingError;
      }

      toast.success("Appointment saved successfully");
      return appointmentId;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
      return null;
    }
  };

  const handleCheckoutSave = async (getFinalPrice: () => number) => {
    if (!currentAppointmentId) {
      toast.error("No appointment found");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          payment_method: paymentMethod,
          discount_type: discountType,
          discount_value: discountValue,
          notes: appointmentNotes,
          total_price: getFinalPrice()
        })
        .eq('id', currentAppointmentId);

      if (updateError) throw updateError;

      toast.success("Payment completed successfully");
      setPaymentCompleted(true);
    } catch (error: any) {
      console.error("Error completing payment:", error);
      toast.error(error.message || "Failed to complete payment");
    }
  };

  return {
    currentAppointmentId,
    paymentMethod,
    discountType,
    discountValue,
    appointmentNotes,
    paymentCompleted,
    setPaymentMethod,
    setDiscountType,
    setDiscountValue,
    setAppointmentNotes,
    handleSaveAppointment,
    handleCheckoutSave,
  };
}
