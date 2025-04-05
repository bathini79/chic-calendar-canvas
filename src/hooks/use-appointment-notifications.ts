
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define notification types for clarity
export const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMATION: 'booking_confirmation',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  REMINDER_1_HOUR: 'reminder_1_hour',
  REMINDER_4_HOURS: 'reminder_4_hours',
  APPOINTMENT_COMPLETED: 'appointment_completed'
};

export type NotificationType = keyof typeof NOTIFICATION_TYPES;

/**
 * Hook for sending appointment notifications through WhatsApp
 */
export const useAppointmentNotifications = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send a notification for an appointment
   * @param appointmentId - The appointment ID
   * @param notificationType - The type of notification to send
   */
  const sendNotification = async (
    appointmentId: string,
    notificationType: NotificationType = "BOOKING_CONFIRMATION"
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke(
        'send-appointment-notification',
        {
          body: {
            appointmentId,
            notificationType: NOTIFICATION_TYPES[notificationType]
          }
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send notification');
      }

      toast.success('Notification sent successfully');
      return true;
    } catch (err: any) {
      console.error('Error sending notification:', err);
      const errorMessage = err.message || 'Failed to send notification';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendNotification,
    isLoading,
    error
  };
};
