import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [isLoading, setIsLoading] = useState(false);
  const [referralProgram, setReferralProgram] = useState<ReferralProgram | null>(null);

  const fetchReferralProgram = useCallback(async () => {
    setIsLoading(true);
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
          setReferralProgram(null);
          return null;
        }
        throw error;
      }

      setReferralProgram(data as ReferralProgram);
      return data;
    } catch (error: any) {
      console.error("Error fetching referral program settings:", error);
      toast.error("Failed to load referral program settings");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      
      setReferralProgram(data as ReferralProgram);
      toast.success("Referral program settings updated successfully");
      return data;
    } catch (error: any) {
      console.error("Error updating referral program settings:", error);
      toast.error(`Failed to update referral program settings: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [referralProgram]);

  return {
    referralProgram,
    isLoading,
    fetchReferralProgram,
    updateReferralProgram
  };
}
