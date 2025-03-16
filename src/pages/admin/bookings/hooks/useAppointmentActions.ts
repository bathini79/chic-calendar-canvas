
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppointmentStatus } from "../types";
import { toast } from "sonner";

export function useAppointmentActions(onCompleted?: () => void) {
  const [isLoading, setIsLoading] = useState(false);

  // This function will update the status of an appointment
  const changeStatus = async (appointmentId: string, status: AppointmentStatus) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", appointmentId);

      if (error) throw error;
      
      toast.success(`Appointment status changed to ${status}`);
      if (onCompleted) onCompleted();
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast.error("Failed to update appointment status");
    } finally {
      setIsLoading(false);
    }
  };

  // This function will update the appointment with refund information
  const refundAppointment = async (appointmentId: string, refundReason: string, refundNotes: string = "") => {
    setIsLoading(true);
    try {
      // First, get the current appointment details
      const { data: appointment, error: fetchError } = await supabase
        .from("appointments")
        .select("*, bookings(*)")
        .eq("id", appointmentId)
        .single();

      if (fetchError) throw fetchError;

      // Create a new refund record
      const { data: refundData, error: refundError } = await supabase
        .from("appointments")
        .update({
          status: "refunded",
          refund_reason: refundReason,
          refund_notes: refundNotes
        })
        .eq("id", appointmentId)
        .select();

      if (refundError) throw refundError;
      
      toast.success("Refund processed successfully");
      if (onCompleted) onCompleted();
      
      return refundData as any;
    } catch (error) {
      console.error("Error processing refund:", error);
      toast.error("Failed to process refund");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    changeStatus,
    refundAppointment
  };
}
