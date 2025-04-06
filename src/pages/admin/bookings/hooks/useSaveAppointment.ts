
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAppointmentNotifications } from '@/hooks/use-appointment-notifications';

export const useSaveAppointment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { sendNotification } = useAppointmentNotifications();

  const saveAppointment = async (appointmentData: any, bookingsData: any[]) => {
    setIsLoading(true);
    try {
      // Upsert appointment data
      const { data: updatedAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .upsert(appointmentData, { onConflict: 'id' })
        .select()
        .single();

      if (appointmentError) {
        throw new Error(`Failed to save appointment: ${appointmentError.message}`);
      }

      // Upsert bookings data
      const upsertBookings = async () => {
        for (const bookingData of bookingsData) {
          const { error: bookingError } = await supabase
            .from('bookings')
            .upsert({ ...bookingData, appointment_id: updatedAppointment.id }, { onConflict: 'id' });

          if (bookingError) {
            throw new Error(`Failed to save booking: ${bookingError.message}`);
          }
        }
      };

      await upsertBookings();

      // Show success notification
      toast.success("Appointment saved successfully");
      
      // Send confirmation notification if it's a new appointment
      try {
        if (updatedAppointment && !appointmentData.id) {
          await sendNotification(updatedAppointment.id, 'booking_confirmation');
        }
      } catch (notificationError) {
        console.error("Error sending confirmation:", notificationError);
        // Don't fail the booking if notification fails
      }

      return updatedAppointment;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || 'Failed to save appointment');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { saveAppointment, isLoading };
};
