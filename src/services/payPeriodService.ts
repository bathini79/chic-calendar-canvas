import { supabase } from "@/integrations/supabase/client";

export interface PayPeriodSettings {
  id?: string;
  frequency: 'monthly' | 'custom';
  start_day_of_month: number | null;
  custom_days: number | null;
  next_start_date: string;
}

class PayPeriodService {
  private tableName = 'pay_period_settings';

  async getPayPeriodSettings(): Promise<PayPeriodSettings | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching pay period settings:', error);
      throw error;
    }

    return data;
  }

  async upsertPayPeriodSettings(settings: PayPeriodSettings): Promise<PayPeriodSettings> {
    const { data: existingSettings } = await supabase
      .from(this.tableName)
      .select('id')
      .maybeSingle();

    let result;
    
    if (existingSettings?.id) {
      // Update
      const { data, error } = await supabase
        .from(this.tableName)
        .update(settings)
        .eq('id', existingSettings.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(settings)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return result;
  }
}

export const payPeriodService = new PayPeriodService();
