
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment, Booking, RefundData } from '../types';

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

  const fetchAppointmentDetails = async (appointmentId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
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

      if (error) throw error;

      if (data) {
        // Map bookings to selected items
        const items = data.bookings
          .filter(booking => booking.status !== 'refunded') // Only show non-refunded items
          .map(booking => {
            if (booking.service) {
              return {
                id: booking.service.id,
                name: booking.service.name,
                price: booking.price_paid,
                type: 'service' as const,
                employee: booking.employee ? {
                  id: booking.employee.id,
                  name: booking.employee.name
                } : undefined,
                duration: booking.service.duration
              };
            }
            if (booking.package) {
              return {
                id: booking.package.id,
                name: booking.package.name,
                price: booking.price_paid,
                type: 'package' as const,
                employee: booking.employee ? {
                  id: booking.employee.id,
                  name: booking.employee.name
                } : undefined,
                duration: booking.package.duration
              };
            }
            return null;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        setSelectedItems(items);
      }

      return data as Appointment;
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
          refund_reason: refundData.reason,
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

      // Update appointment status
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      // Update all associated bookings status
      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({ status })
        .in('id', bookingIds);

      if (bookingsError) throw bookingsError;

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
    selectedItems,
    fetchAppointmentDetails,
    updateAppointmentStatus,
    processRefund
  };
}
