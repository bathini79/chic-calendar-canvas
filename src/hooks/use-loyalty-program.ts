
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LoyaltyProgramSettings } from '@/pages/admin/bookings/types';

export type LoyaltyProgramFormValues = {
  enabled: boolean;
  points_per_spend: number;
  point_value: number;
  min_redemption_points: number;
  min_billing_amount: number | null;
  apply_to_all: boolean;
  applicable_services: string[];
  applicable_packages: string[];
  points_validity_days: number | null;
  cashback_validity_days: number | null;
  max_redemption_type: "fixed" | "percentage" | null;
  max_redemption_points: number | null;
  max_redemption_percentage: number | null;
};

export function useLoyaltyProgram() {
  const [settings, setSettings] = useState<LoyaltyProgramSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('loyalty_program_settings')
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching loyalty program settings:', error);
        return;
      }
      
      if (data) {
        setSettings(data as LoyaltyProgramSettings);
      }
    } catch (error) {
      console.error('Unexpected error in fetchSettings:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateSettings = async (values: LoyaltyProgramFormValues) => {
    try {
      setIsLoading(true);
      
      // If no settings exist, create a new record
      if (!settings) {
        const { error } = await supabase
          .from('loyalty_program_settings')
          .insert([values]);
          
        if (error) {
          toast.error('Failed to create loyalty program settings');
          console.error('Error creating loyalty program settings:', error);
          return;
        }
        
        toast.success('Loyalty program settings created successfully');
      } else {
        // Update existing settings
        const { error } = await supabase
          .from('loyalty_program_settings')
          .update(values)
          .eq('id', settings.id);
          
        if (error) {
          toast.error('Failed to update loyalty program settings');
          console.error('Error updating loyalty program settings:', error);
          return;
        }
        
        toast.success('Loyalty program settings updated successfully');
      }
      
      // Refresh settings after update
      fetchSettings();
    } catch (error) {
      console.error('Unexpected error in updateSettings:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    settings,
    isLoading,
    fetchSettings,
    updateSettings
  };
}
