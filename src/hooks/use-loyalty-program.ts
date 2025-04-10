
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LoyaltyProgramSettings = {
  id: string;
  enabled: boolean;
  points_validity_days: number | null;
  cashback_validity_days: number | null;
  point_value: number;
  min_redemption_points: number;
  apply_to_all: boolean;
  points_per_spend: number;
  min_billing_amount: number | null;
  applicable_services: string[];
  applicable_packages: string[];
  created_at: string;
  updated_at: string;
  max_redemption_points: number | null;
  max_redemption_percentage: number | null;
  max_redemption_type: "fixed" | "percentage" | null;
};

export type LoyaltyProgramFormValues = Omit<LoyaltyProgramSettings, 'id' | 'created_at' | 'updated_at'>;

export function useLoyaltyProgram() {
  const [settings, setSettings] = useState<LoyaltyProgramSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('loyalty_program_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      toast.error(`Error fetching loyalty program settings: ${error.message}`);
      console.error("Error fetching loyalty program settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (values: Partial<LoyaltyProgramFormValues>): Promise<LoyaltyProgramSettings | null> => {
    try {
      if (!settings || !settings.id) {
        // Create new settings if none exist
        const { data, error } = await supabase
          .from('loyalty_program_settings')
          .insert([values])
          .select()
          .single();

        if (error) throw error;
        toast.success("Loyalty program settings created successfully");
        setSettings(data);
        return data;
      } else {
        // Update existing settings
        const { data, error } = await supabase
          .from('loyalty_program_settings')
          .update(values)
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        toast.success("Loyalty program settings updated successfully");
        setSettings(data);
        return data;
      }
    } catch (error: any) {
      toast.error(`Error updating loyalty program settings: ${error.message}`);
      console.error("Error updating loyalty program settings:", error);
      return null;
    }
  };

  return {
    settings,
    isLoading,
    fetchSettings,
    updateSettings
  };
}
