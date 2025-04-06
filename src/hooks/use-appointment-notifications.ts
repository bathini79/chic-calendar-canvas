
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        toast.info("No pending notifications found");
        return { processed: 0 };
      }

      // Check if GupShup is configured and active
      const { data: gupshupConfig, error: configError } = await supabase
        .from('messaging_providers')
        .select('*')
        .eq('provider_name', 'gupshup')
        .single();
      
      if (configError && configError.code !== 'PGRST116') throw configError;
      
      // If GupShup is not configured or not active, use Supabase edge function
      const useGupshup = gupshupConfig && 
                          gupshupConfig.is_active && 
                          gupshupConfig.configuration?.api_key && 
                          gupshupConfig.configuration?.app_id && 
                          gupshupConfig.configuration?.source_mobile;
      
      const results = [];
      
      // Process each notification
      for (const notification of pendingNotifications) {
        try {
          // Call the appropriate edge function based on configuration
          const { data, error } = await supabase.functions.invoke(
            useGupshup ? 'send-gupshup-notification' : 'send-appointment-notification',
            {
              body: { notificationId: notification.id }
            }
          );
          
          if (error) throw error;
          
          results.push({
            id: notification.id,
            success: true,
            message: data?.message || 'Notification sent'
          });
          
        } catch (error: any) {
          console.error(`Error processing notification ${notification.id}:`, error);
          
          // Mark the notification as failed
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              error_message: error.message || 'Failed to send notification',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id);
          
          results.push({
            id: notification.id,
            success: false,
            message: error.message
          });
        }
      }
      
      // Refresh the notification queue data
      queryClient.invalidateQueries({ queryKey: ['notification_queue'] });
      
      // Show success message
      toast.success(`Processed ${results.length} notifications`);
      
      return {
        processed: results.length,
        results
      };
      
    } catch (error: any) {
      console.error('Error processing notifications:', error);
      toast.error(error.message || 'Failed to process notifications');
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
    isLoading: isPending
  };
}
