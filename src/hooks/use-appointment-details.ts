import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Appointment } from "@/types/appointment";

export function useAppointmentDetails(appointmentId: string | null) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAppointmentDetails = async (id: string) => {
    try {
      // Fetch the basic appointment data
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          bookings:bookings(
            *,
            service:services(*),
            package:packages(*),
            employee:employees(*)
          )
        `)
        .eq('id', id)
        .single();

      if (appointmentError) throw appointmentError;
      if (!appointmentData) throw new Error('Appointment not found');

      // Convert the appointment status to correct format if necessary
      if (appointmentData.status === 'no-show') {
        appointmentData.status = 'noshow';
      }

      // Create a proper Appointment object with all required fields
      return {
        ...appointmentData,
        membership_discount: 0, // Default value
        membership_id: null,    // Default value
        membership_name: null,  // Default value
        location_id: appointmentData.location || null, // Use location as location_id
      } as Appointment;
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!appointmentId) {
      setAppointment(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchAppointmentDetails(appointmentId)
      .then((data) => {
        setAppointment(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [appointmentId]);

  return { appointment, isLoading, error };
}
