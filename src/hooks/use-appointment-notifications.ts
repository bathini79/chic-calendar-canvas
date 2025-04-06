
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
