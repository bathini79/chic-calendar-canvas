
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment, RefundData } from '../types';

export function useAppointmentActions() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchAppointmentDetails = async (appointmentId: string) => {
    try {
      setIsLoading(true);
      const { data: appointmentData, error: appointmentError } = await supabase
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

      // Fetch related refunds
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

      return {
        ...appointmentData,
        refunds: refunds || []
      } as Appointment & { refunds: Appointment[] };
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
        .select(`
          *,
          bookings (*)
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      // Get the selected bookings to calculate refund amount
      const { data: selectedBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('price_paid')
        .in('id', bookingIds);

      if (bookingsError) throw bookingsError;

      const refundAmount = selectedBookings.reduce((total, booking) => total + booking.price_paid, 0);

      // Create a refund transaction
      const { data: refundAppointment, error: refundError } = await supabase
        .from('appointments')
        .insert({
          customer_id: originalAppointment.customer_id,
          status: 'refunded',
          transaction_type: 'refund',
          original_appointment_id: appointmentId,
          refunded_by: refundData.refundedBy,
          refund_reason: refundData.reason,
          refund_notes: refundData.notes,
          total_price: -refundAmount,
          start_time: originalAppointment.start_time,
          end_time: originalAppointment.end_time,
          payment_method: originalAppointment.payment_method
        })
        .select()
        .single();

      if (refundError) throw refundError;

      // Update the original bookings
      const { error: updateBookingsError } = await supabase
        .from('bookings')
        .update({
          status: 'refunded',
          refund_reason: refundData.reason,
          refund_notes: refundData.notes,
          refunded_by: refundData.refundedBy,
          refunded_at: new Date().toISOString()
        })
        .in('id', bookingIds);

      if (updateBookingsError) throw updateBookingsError;

      // Update original appointment status
      const isFullRefund = bookingIds.length === originalAppointment.bookings?.length;
      const { error: updateStatusError } = await supabase
        .from('appointments')
        .update({
          status: isFullRefund ? 'refunded' : 'partially_refunded'
        })
        .eq('id', appointmentId);

      if (updateStatusError) throw updateStatusError;

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
    status: Appointment['status']
  ) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success(`Appointment ${status} successfully`);
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
    fetchAppointmentDetails,
    updateAppointmentStatus,
    processRefund
  };
}
