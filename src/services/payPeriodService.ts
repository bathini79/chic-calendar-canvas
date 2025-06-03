import { supabase } from "@/integrations/supabase/client";
import { PayPeriod } from "@/types/payroll-db";
import { format, addDays, addMonths } from "date-fns";

export interface PayPeriodSettings {
  id?: string;
  frequency: 'monthly' | 'custom';
  start_day_of_month: number | null;
  custom_days: number | null;
  next_start_date: string;
}

class PayPeriodService {
  private settingsTableName = 'pay_period_settings';
  private payPeriodsTableName = 'pay_periods';
  async getPayPeriodSettings(): Promise<PayPeriodSettings | null> {
    const { data, error } = await supabase
      .from(this.settingsTableName)
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching pay period settings:', error);
      throw error;
    }

    return data;
  }

  async upsertPayPeriodSettings(settings: PayPeriodSettings): Promise<PayPeriodSettings> {    const { data: existingSettings } = await supabase
      .from(this.settingsTableName)
      .select('id')
      .maybeSingle();

    let result;
    
    if (existingSettings?.id) {
      // Update
      const { data, error } = await supabase
        .from(this.settingsTableName)
        .update(settings)
        .eq('id', existingSettings.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from(this.settingsTableName)
        .insert(settings)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }    return result;
  }

  /**
   * Get all pay periods with optional filtering by status
   */
  async listPayPeriods(status?: 'active' | 'archived'): Promise<PayPeriod[]> {
    let query = supabase
      .from(this.payPeriodsTableName)
      .select('*')
      .order('start_date', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching pay periods:', error);
      throw error;
    }
    
    return data as PayPeriod[];
  }

  /**
   * Get a pay period by ID
   */
  async getPayPeriodById(id: string): Promise<PayPeriod> {
    const { data, error } = await supabase
      .from(this.payPeriodsTableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching pay period:', error);
      throw error;
    }
    
    return data as PayPeriod;
  }

  /**
   * Create a new pay period
   */
  async createPayPeriod(startDate: string, endDate: string, name: string): Promise<PayPeriod> {
    const { data, error } = await supabase
      .from(this.payPeriodsTableName)
      .insert({
        name,
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pay period:', error);
      throw error;
    }
    
    return data as PayPeriod;
  }

  /**
   * Get or create a pay period for a specific date range
   */
  async getPayPeriodForDates(startDate: string, endDate: string): Promise<PayPeriod> {
    // First, try to find an existing pay period for these dates
    const { data: existingPeriod, error: findError } = await supabase
      .from(this.payPeriodsTableName)
      .select('*')
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .maybeSingle();
    
    if (findError) {
      console.error('Error finding pay period:', findError);
      throw findError;
    }
    
    // If one exists, return it
    if (existingPeriod) {
      return existingPeriod as PayPeriod;
    }
    
    // Otherwise, create a new one
    // Format dates for name generation (e.g., "May 26 - May 31, 2025")
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const formattedName = `${format(startDateObj, 'MMM d')} - ${format(endDateObj, 'MMM d, yyyy')}`;
    
    return this.createPayPeriod(startDate, endDate, formattedName);
  }

  /**
   * Update a pay period
   */
  async updatePayPeriod(id: string, updates: Partial<PayPeriod>): Promise<PayPeriod> {
    const { data, error } = await supabase
      .from(this.payPeriodsTableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating pay period:', error);
      throw error;
    }
    
    return data as PayPeriod;
  }

  /**
   * Archive a pay period
   */
  async archivePayPeriod(id: string): Promise<PayPeriod> {
    return this.updatePayPeriod(id, { status: 'archived' });
  }

  /**
   * Generate the next pay period based on settings
   */
  async generateNextPayPeriod(): Promise<PayPeriod> {
    // Get current settings
    const settings = await this.getPayPeriodSettings();
    if (!settings) {
      throw new Error('No pay period settings found');
    }
    
    const nextStartDate = new Date(settings.next_start_date);
    let endDate: Date;
    let periodName: string;
    
    if (settings.frequency === 'monthly') {
      // For monthly, end date is the day before the start day of next month
      const nextMonth = addMonths(nextStartDate, 1);
      endDate = addDays(nextMonth, -1);
      periodName = `${format(nextStartDate, 'MMM yyyy')}`;
    } else {
      // For custom, add custom_days-1 to start date
      endDate = addDays(nextStartDate, (settings.custom_days || 14) - 1);
      periodName = `${format(nextStartDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    
    // Create the period
    const newPeriod = await this.createPayPeriod(
      format(nextStartDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
      periodName
    );
    
    // Update settings with the next start date
    let nextNextStartDate: Date;
    if (settings.frequency === 'monthly') {
      // For monthly, next start date is the same day of next month
      nextNextStartDate = addMonths(nextStartDate, 1);
    } else {
      // For custom, add custom_days to start date
      nextNextStartDate = addDays(nextStartDate, settings.custom_days || 14);
    }
    
    await this.upsertPayPeriodSettings({
      ...settings,
      next_start_date: format(nextNextStartDate, 'yyyy-MM-dd')
    });
    
    return newPeriod;
  }
}

export const payPeriodService = new PayPeriodService();
