import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";

export type ReferralProgram = {
  id?: string;
  is_enabled: boolean;
  
  // Service rewards
  service_reward_type: 'percentage' | 'fixed';
  service_percentage?: number;
  service_fixed_amount?: number;
  
  // Membership rewards
  membership_reward_type: 'percentage' | 'fixed';
  membership_percentage?: number;
  membership_fixed_amount?: number;
  
  // Product rewards
  product_reward_type: 'percentage' | 'fixed';
  product_percentage?: number;
  product_fixed_amount?: number;
  
  created_at?: string;
  updated_at?: string;
  
  // Legacy fields (for backward compatibility)
  reward_type?: 'percentage' | 'fixed';
  percentage?: number;
  fixed_amount?: number;
};

export function useReferralProgram() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    data: referralProgram,
    isLoading: isQueryLoading,
    error,
    refetch: fetchReferralProgram
  } = useQuery({
    queryKey: ['referral-program'],
    queryFn: async (): Promise<ReferralProgram | null> => {
      try {
        const { data, error } = await supabase
          .from("referral_program")
          .select("*")
          .order("created_at", { ascending: false }) // Get the most recent configuration
          .limit(1)
          .single();

        if (error) {
          // If no record found, it's not technically an error for our use case
          if (error.code === "PGRST116") {
            console.log("No referral program configuration found, using defaults");
            return {
              is_enabled: false,
              service_reward_type: 'percentage',
              membership_reward_type: 'percentage', 
              product_reward_type: 'percentage'
            } as ReferralProgram;
          }
          throw error;
        }

        return data as ReferralProgram;
      } catch (error: any) {
        console.error("Error fetching referral program settings:", error);
        // Return default disabled state instead of throwing
        return {
          is_enabled: false,
          service_reward_type: 'percentage',
          membership_reward_type: 'percentage',
          product_reward_type: 'percentage'
        } as ReferralProgram;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes 
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // Always provide a fallback value
    placeholderData: {
      is_enabled: false,
      service_reward_type: 'percentage',
      membership_reward_type: 'percentage',
      product_reward_type: 'percentage'
    } as ReferralProgram
  });

  // Load referral program settings when hook is first used
  useEffect(() => {
    fetchReferralProgram();
  }, [fetchReferralProgram]);
  const updateReferralProgram = useCallback(async (settings: Partial<ReferralProgram>) => {
    setIsLoading(true);
    try {
      let data;
      
      // If we have existing settings, update them
      if (referralProgram?.id) {
        const { data: updatedData, error } = await supabase
          .from("referral_program")
          .update(settings)
          .eq("id", referralProgram.id)
          .select()
          .single();
          
        if (error) throw error;
        data = updatedData;
      } else {
        // Otherwise create new settings
        const { data: newData, error } = await supabase
          .from("referral_program")
          .insert([settings])
          .select()
          .single();
          
        if (error) throw error;
        data = newData;
      }
      
      // Update the React Query cache instead of using a local state setter
      queryClient.setQueryData(['referral-program'], data);
      toast.success("Referral program settings updated successfully");
      return data;
    } catch (error: any) {
      console.error("Error updating referral program settings:", error);
      toast.error(`Failed to update referral program settings: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [referralProgram, queryClient]);
  return {
    referralProgram,
    isLoading: isLoading || isQueryLoading,
    fetchReferralProgram,
    updateReferralProgram
  };
}
