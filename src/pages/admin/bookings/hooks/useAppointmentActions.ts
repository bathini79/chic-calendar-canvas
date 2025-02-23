
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import type { Appointment, RefundData, TransactionDetails } from "../types";

export const useAppointmentActions = () => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchAppointmentDetails = async (appointmentId: string): Promise<TransactionDetails | null> => {
    try {
      // Fetch original sale
      const { data: originalSale, error: saleError } = await supabase
        .from("appointments")
        .select(`
          *,
          bookings (
            *,
            service:services (*),
            package:packages (*),
            employee:employees (*)
          ),
          customer:profiles (*)
        `)
        .eq("id", appointmentId)
        .single();

      if (saleError) throw saleError;

      // Fetch refunds
      const { data: refunds, error: refundsError } = await supabase
        .from("appointments")
        .select(`
          *,
          bookings (
            *,
            service:services (*),
            package:packages (*),
            employee:employees (*)
          ),
          customer:profiles (*)
        `)
        .eq("original_appointment_id", appointmentId)
        .eq("transaction_type", "refund");

      if (refundsError) throw refundsError;

      // Transform the data to match types
      const transformedSale = {
        ...originalSale,
        payment_method: originalSale.payment_method as "cash" | "online",
        discount_type: originalSale.discount_type as "none" | "percentage" | "fixed",
        transaction_type: originalSale.transaction_type as "sale" | "refund",
      } as Appointment;

      const transformedRefunds = (refunds || []).map(refund => ({
        ...refund,
        payment_method: refund.payment_method as "cash" | "online",
        discount_type: refund.discount_type as "none" | "percentage" | "fixed",
        transaction_type: refund.transaction_type as "sale" | "refund",
      })) as Appointment[];

      return {
        originalSale: transformedSale,
        refunds: transformedRefunds,
      };
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      return null;
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: Appointment["status"],
    reason?: string
  ) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("appointments")
        .update({ status, refund_reason: reason })
        .eq("id", appointmentId);

      if (error) throw error;
      toast.success("Appointment status updated successfully");
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast.error("Failed to update appointment status");
    } finally {
      setIsLoading(false);
    }
  };

  const processRefund = async (
    appointmentId: string,
    refundData: RefundData,
    selectedItems: string[]
  ) => {
    try {
      setIsLoading(true);
      
      const { data: originalAppointment, error: fetchError } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single();

      if (fetchError) throw fetchError;

      // Create refund record
      const { error: refundError } = await supabase
        .from("appointments")
        .insert({
          ...originalAppointment,
          id: undefined, // Let Supabase generate new ID
          status: "refunded",
          transaction_type: "refund",
          original_appointment_id: appointmentId,
          refund_reason: refundData.reason,
          refund_notes: refundData.notes,
          refunded_by: refundData.refundedBy,
        });

      if (refundError) throw refundError;

      // Update original appointment status
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "refunded" })
        .eq("id", appointmentId);

      if (updateError) throw updateError;

      toast.success("Refund processed successfully");
    } catch (error) {
      console.error("Error processing refund:", error);
      toast.error("Failed to process refund");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    fetchAppointmentDetails,
    updateAppointmentStatus,
    processRefund,
  };
};
