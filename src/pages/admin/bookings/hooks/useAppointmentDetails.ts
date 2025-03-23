
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAppointmentDetails(appointmentId?: string) {
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [locationDetails, setLocationDetails] = useState<any>(null);
  const [receiptSettings, setReceiptSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchAppointmentDetails() {
      if (!appointmentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch appointment details with related bookings
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:profiles(*),
            bookings(
              *,
              service:services(*),
              package:packages(*),
              employee:employees(*)
            )
          `)
          .eq('id', appointmentId)
          .single();

        if (appointmentError) throw appointmentError;

        if (!appointment) {
          throw new Error('Appointment not found');
        }

        setAppointmentDetails(appointment);
        setCustomerData(appointment.customer);

        // Get location details if location_id is available
        if (appointment.location_id) {
          const { data: location, error: locationError } = await supabase
            .from('locations')
            .select('*')
            .eq('id', appointment.location_id)
            .single();

          if (locationError) {
            console.error('Error fetching location:', locationError);
          } else {
            setLocationDetails(location);

            // Get receipt settings for this location
            const { data: receipt, error: receiptError } = await supabase
              .from('receipt_settings')
              .select('*')
              .eq('location_id', appointment.location_id)
              .maybeSingle();

            if (receiptError) {
              console.error('Error fetching receipt settings:', receiptError);
            } else {
              setReceiptSettings(receipt);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching appointment details:', err);
        setError(err);
        toast.error('Failed to load appointment details');
      } finally {
        setLoading(false);
      }
    }

    fetchAppointmentDetails();
  }, [appointmentId]);

  return {
    appointmentDetails,
    customerData,
    locationDetails,
    receiptSettings,
    loading,
    error,
  };
}
