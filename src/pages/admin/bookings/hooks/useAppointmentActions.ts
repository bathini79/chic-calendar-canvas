
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment, Booking } from '../types';

export function useAppointmentActions() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchAppointmentDetails = async (appointmentId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles(*),
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
    fetchAppointmentDetails,
    updateAppointmentStatus,
  };
}
