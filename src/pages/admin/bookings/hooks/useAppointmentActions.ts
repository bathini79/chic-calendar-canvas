
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment, Booking, RefundData, TransactionDetails } from '../types';

// Define the RefundReason type to match what's expected in the database
type RefundReason = "customer_dissatisfaction" | "service_quality_issue" | "scheduling_error" | "health_concern" | "price_dispute" | "other";

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  type: 'service' | 'package';
  employee?: {
    id: string;
    name: string;
  };
  duration?: number;
}

export function useAppointmentActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const fetchAppointmentDetails = async (appointmentId: string): Promise<TransactionDetails | null> => {
    try {
      setIsLoading(true);

      // First fetch the appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles!appointments_customer_id_fkey(*),
          bookings (
            *,
            service:services(*),
            package:packages(*),
            employee:employees!bookings_employee_id_fkey(*)
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      // If this is a refund, get the original sale
      if (appointment.transaction_type === 'refund') {
        const { data: originalSale, error: originalError } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:profiles!appointments_customer_id_fkey(*),
            bookings (
              *,
              service:services(*),
              package:packages(*),
              employee:employees!bookings_employee_id_fkey(*)
            )
          `)
          .eq('id', appointment.original_appointment_id)
          .single();

        if (originalError) throw originalError;

        // Get all refunds for this original sale
        const { data: refunds, error: refundsError } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:profiles!appointments_customer_id_fkey(*),
            bookings (
              *,
              service:services(*),
              package:packages(*),
              employee:employees!bookings_employee_id_fkey(*)
            )
          `)
          .eq('original_appointment_id', originalSale.id)
          .eq('transaction_type', 'refund');

        if (refundsError) throw refundsError;

        // Create TransactionDetails with all required properties
        return {
          id: originalSale.id,
          amount: originalSale.total_price,
          status: originalSale.status,
          payment_method: originalSale.payment_method,
          created_at: originalSale.created_at,
          originalSale,
          refunds: refunds || []
        };
      } else {
        // This is the original sale, get all its refunds
        const { data: refunds, error: refundsError } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:profiles!appointments_customer_id_fkey(*),
            bookings (
              *,
              service:services(*),
              package:packages(*),
              employee:employees!bookings_employee_id_fkey(*)
            )
          `)
          .eq('original_appointment_id', appointmentId)
          .eq('transaction_type', 'refund');

        if (refundsError) throw refundsError;

        // Create TransactionDetails with all required properties
        return {
          id: appointment.id,
          amount: appointment.total_price,
          status: appointment.status,
          payment_method: appointment.payment_method,
          created_at: appointment.created_at,
          originalSale: appointment,
          refunds: refunds || []
        };
      }
    } catch (error: any) {
      console.error('Error fetching appointment:', error);
      toast.error('Failed to load appointment details');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const processRefund = async (
    appointmentId: string,
    bookingIds: string[],
    refundData: RefundData
  ) => {
    try {
      setIsLoading(true);

      // First get the original appointment details
      const { data: originalAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      // Map refund reason to allowed values
      let mappedRefundReason: RefundReason = "other";
      if (refundData.reason === "booking_error") {
        mappedRefundReason = "scheduling_error"; // Map booking_error to scheduling_error
      } else if (refundData.reason === "service_unavailable") {
        mappedRefundReason = "service_quality_issue"; // Map service_unavailable to service_quality_issue
      } else if (refundData.reason === "customer_emergency" || refundData.reason === "customer_no_show") {
        mappedRefundReason = "other"; // Map customer reasons to other
      } else if (
        ["customer_dissatisfaction", "service_quality_issue", "scheduling_error", 
         "health_concern", "price_dispute", "other"].includes(refundData.reason as string)
      ) {
        mappedRefundReason = refundData.reason as RefundReason;
      }

      // Create a refund transaction
      const { data: refundAppointment, error: refundError } = await supabase
        .from('appointments')
        .insert({
          customer_id: originalAppointment.customer_id,
          status: 'refunded',
          transaction_type: 'refund',
          original_appointment_id: appointmentId,
          refunded_by: refundData.refundedBy,
          refund_reason: mappedRefundReason,
          refund_notes: refundData.notes,
          total_price: 0, // Will be updated after processing bookings
          start_time: originalAppointment.start_time,
          end_time: originalAppointment.end_time
        })
        .select()
        .single();

      if (refundError) throw refundError;

      // Update the original bookings
      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({
          status: 'refunded',
          refund_reason: mappedRefundReason,
          refund_notes: refundData.notes,
          refunded_by: refundData.refundedBy,
          refunded_at: new Date().toISOString()
        })
        .in('id', bookingIds);

      if (bookingsError) throw bookingsError;

      // Get all bookings for this appointment to determine if it's a full or partial refund
      const { data: allBookings, error: countError } = await supabase
        .from('bookings')
        .select('id, status, price_paid')
        .eq('appointment_id', appointmentId);

      if (countError) throw countError;

      // Check if all bookings are now refunded
      const isFullRefund = allBookings?.every(booking => 
        booking.status === 'refunded' || bookingIds.includes(booking.id)
      );

      // Calculate total refund amount
      const refundAmount = allBookings
        ?.filter(booking => bookingIds.includes(booking.id))
        .reduce((total, booking) => total + (booking.price_paid || 0), 0) || 0;

      // Update the refund appointment with the total amount
      const { error: updateRefundError } = await supabase
        .from('appointments')
        .update({
          total_price: -refundAmount // Negative amount to indicate refund
        })
        .eq('id', refundAppointment.id);

      if (updateRefundError) throw updateRefundError;

      // Update the original appointment status
      const { error: originalAppointmentError } = await supabase
        .from('appointments')
        .update({
          status: isFullRefund ? 'refunded' : 'partially_refunded'
        })
        .eq('id', appointmentId);

      if (originalAppointmentError) throw originalAppointmentError;

      // Refresh the selected items after refund
      await fetchAppointmentDetails(appointmentId);

      toast.success('Refund processed successfully');
      return true;
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast.error(error.message || 'Failed to process refund');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: Appointment['status'],
    bookingIds: string[]
  ) => {
    try {
      setIsLoading(true);

      // First update the appointment status
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      // Then update all associated bookings
      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', bookingIds);

      if (bookingsError) throw bookingsError;

      let message = '';
      switch (status) {
        case 'canceled':
          message = 'Appointment canceled successfully';
          break;
        case 'noshow':
          message = 'Appointment marked as no-show';
          break;
        default:
          message = `Appointment ${status} successfully`;
      }
      
      toast.success(message);
      return true;
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast.error(error.message || 'Failed to update appointment');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    selectedItems,
    fetchAppointmentDetails,
    updateAppointmentStatus,
    processRefund
  };
}
