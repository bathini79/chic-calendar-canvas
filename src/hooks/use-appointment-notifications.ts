
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useAppointmentNotifications() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Process pending notifications
  const processPendingNotifications = async () => {
    setIsLoading(true);
    try {
      // Get all pending notifications
      const { data: pendingNotifications, error: fetchError } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at');

      if (fetchError) {
        throw new Error(`Failed to fetch pending notifications: ${fetchError.message}`);
      }

      if (!pendingNotifications || pendingNotifications.length === 0) {
        toast({
          title: 'No pending notifications',
          description: 'There are no pending notifications to process.',
        });
        return;
      }

      // Check if GupShup is configured and active
      const { data: gupshupConfig, error: configError } = await supabase
        .from('messaging_providers')
        .select('*')
        .eq('provider_name', 'gupshup')
        .single();

      if (configError) {
        throw new Error(`Failed to fetch GupShup configuration: ${configError.message}`);
      }

      if (!gupshupConfig || !gupshupConfig.is_active) {
        throw new Error('GupShup integration is not active. Please configure it first.');
      }

      if (!gupshupConfig.configuration?.app_id || !gupshupConfig.configuration?.api_key || !gupshupConfig.configuration?.source_mobile) {
        throw new Error('GupShup configuration is incomplete. Please update the settings.');
      }

      // Process each notification
      let processedCount = 0;
      
      for (const notification of pendingNotifications) {
        try {
          // Call the Edge Function to send the notification
          const { error: sendError } = await supabase.functions.invoke('send-gupshup-notification', {
            body: { notificationId: notification.id }
          });

          if (sendError) {
            throw new Error(`Failed to send notification: ${sendError.message}`);
          }

          processedCount++;
        } catch (error: any) {
          console.error('Error processing notification:', error);
          
          // Update the notification status to failed
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
              error_message: error.message || 'Unknown error'
            })
            .eq('id', notification.id);
        }
      }

      toast({
        title: 'Notifications processed',
        description: `Successfully processed ${processedCount} of ${pendingNotifications.length} notifications.`,
      });

    } catch (error: any) {
      console.error('Error in processPendingNotifications:', error);
      toast({
        title: 'Error processing notifications',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Send a single notification (for testing or manual sending)
  const sendNotification = async (notificationId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-gupshup-notification', {
        body: { notificationId }
      });

      if (error) {
        throw new Error(`Failed to send notification: ${error.message}`);
      }

      toast({
        title: 'Notification sent',
        description: 'The notification was sent successfully.',
      });
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Error sending notification',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a notification for an appointment
  const createAppointmentNotification = async (appointmentId: string, notificationType: string) => {
    setIsLoading(true);
    try {
      // Get appointment details
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles:customer_id(*)
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError) {
        throw new Error(`Failed to fetch appointment details: ${appointmentError.message}`);
      }

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check if the customer has a phone number
      if (!appointment.profiles?.phone_number) {
        throw new Error('Customer does not have a phone number');
      }

      // Create a message based on notification type
      let message = '';
      switch (notificationType) {
        case 'appointment_reminder':
          message = `Hello ${appointment.profiles.full_name || 'there'},\n\nThis is a reminder for your upcoming appointment on ${new Date(appointment.start_time).toLocaleString()}.\n\nWe look forward to seeing you!`;
          break;
        case 'appointment_confirmation':
          message = `Hello ${appointment.profiles.full_name || 'there'},\n\nYour appointment has been scheduled for ${new Date(appointment.start_time).toLocaleString()}.\n\nWe look forward to seeing you!`;
          break;
        default:
          message = `Hello ${appointment.profiles.full_name || 'there'},\n\nThis is a notification about your appointment on ${new Date(appointment.start_time).toLocaleString()}.`;
      }

      // Add the notification to the queue
      const { error: insertError } = await supabase
        .from('notification_queue')
        .insert({
          appointment_id: appointmentId,
          notification_type: notificationType,
          recipient_number: appointment.profiles.phone_number,
          message_content: message,
          status: 'pending'
        });

      if (insertError) {
        throw new Error(`Failed to create notification: ${insertError.message}`);
      }

      toast({
        title: 'Notification created',
        description: 'The notification has been queued for sending.',
      });
    } catch (error: any) {
      console.error('Error creating notification:', error);
      toast({
        title: 'Error creating notification',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    processPendingNotifications,
    sendNotification,
    createAppointmentNotification
  };
}
