import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DiscountRewardUsageConfig {
  id: string;
  location_id: string;
  reward_strategy: 'single_only' | 'multiple_allowed' | 'combinations_only';
  max_rewards_per_booking: number;
  allowed_discount_types: string[];
  reward_combinations: string[][];
  discount_enabled: boolean;
  coupon_enabled: boolean;
  membership_enabled: boolean;
  loyalty_points_enabled: boolean;
  referral_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useDiscountRewardUsageConfig(locationId?: string) {
  const [config, setConfig] = useState<DiscountRewardUsageConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConfig = async () => {
    if (!locationId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_reward_usage_config')
        .select('*')
        .eq('location_id', locationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
      } else {        // Create default config if not exists
        const defaultConfig = {
          location_id: locationId,
          reward_strategy: 'single_only' as const,
          max_rewards_per_booking: 1,
          allowed_discount_types: ['discount', 'coupon', 'membership', 'loyalty_points', 'referral'],
          reward_combinations: [],
          discount_enabled: true,
          coupon_enabled: true,
          membership_enabled: true,
          loyalty_points_enabled: true,
          referral_enabled: true,
        };

        const { data: newData, error: insertError } = await supabase
          .from('discount_reward_usage_config')
          .insert(defaultConfig)
          .select()
          .single();

        if (insertError) throw insertError;
        setConfig(newData);
      }
    } catch (error: any) {
      console.error('Error fetching discount reward usage config:', error);
      toast.error(`Failed to fetch configuration: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<DiscountRewardUsageConfig>) => {
    if (!config) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_reward_usage_config')
        .update(updates)
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;

      setConfig(data);
      toast.success('Configuration updated successfully');
    } catch (error: any) {
      console.error('Error updating discount reward usage config:', error);
      toast.error(`Failed to update configuration: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [locationId]);

  return {
    config,
    isLoading,
    fetchConfig,
    updateConfig,
  };
}
