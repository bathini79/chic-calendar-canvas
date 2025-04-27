
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMATION: 'booking_confirmation',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  REMINDER_1_HOUR: 'reminder_1_hour',
  REMINDER_4_HOURS: 'reminder_4_hours',
  APPOINTMENT_COMPLETED: 'appointment_completed'
};

export function useAppointmentNotifications() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const processPendingNotifications = async () => {
    try {
      setIsLoading(true);
      
      // Get pending notifications
      const { data: pendingNotifications, error: fetchError } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'pending')
        .limit(10);
      
      if (fetchError) throw fetchError;
      
      if (!pendingNotifications || pendingNotifications.length === 0) {
        return { processed: 0 };
      }

      toast.success(`Processed ${pendingNotifications.length} notifications`);
      
      return {
        processed: pendingNotifications.length
      };
      
    } catch (error: any) {
      console.error('Error processing notifications:', error);
      toast.error(error.message || 'Failed to process notifications');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Send appointment notification function
  const sendNotification = async (appointmentId: string, notificationType = NOTIFICATION_TYPES.BOOKING_CONFIRMATION) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('send-appointment-notification', {
        body: { 
          appointmentId, 
          notificationType 
        }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success("Confirmation message sent successfully");
      } else {
        throw new Error(data.error || "Failed to send confirmation message");
      }
      
      return data;
    } catch (error: any) {
      console.error("Error sending appointment notification:", error);
      toast.error(error.message || "Failed to send confirmation message");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: processPendingNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_queue'] });
    }
  });

  return {
    processPendingNotifications: mutate,
    sendNotification,
    isLoading: isPending || isLoading
  };
}
