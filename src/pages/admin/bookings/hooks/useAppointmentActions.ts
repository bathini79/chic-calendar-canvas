
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment, Booking } from '../types';

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
            employee:employees(*)
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

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
    refundData: {
      reason: string;
      notes?: string;
      refundedBy: string;
    }
  ) => {
    try {
      setIsLoading(true);

      // First update the bookings
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
        .select('id, status')
        .eq('appointment_id', appointmentId);

      if (countError) throw countError;

      // Check if all bookings are now refunded
      const isFullRefund = allBookings?.every(booking => 
        booking.status === 'refunded' || bookingIds.includes(booking.id)
      );

      // Update the appointment status
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          status: isFullRefund ? 'refunded' : 'partially_refunded',
          refunded_by: refundData.refundedBy,
          refund_reason: refundData.reason,
          refund_notes: refundData.notes
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

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
