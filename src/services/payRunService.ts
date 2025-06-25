import { supabase } from "@/integrations/supabase/client";
import { PayRun, PayRunItem } from "@/types/payroll-db";

export interface PayRunSummary {
  earnings: number;
  other: number;
  total: number;
  paid: number;
  toPay: number;
  total_employees: number;
}

export interface AdjustmentData {
  employeeId: string;
  compensationType: 'wages' | 'commission' | 'tips' | 'other';
  amount: number;
  description: string;
  isAddition: boolean; // true for addition, false for deduction
}

class PayRunService {
  private readonly payRunsTable = 'pay_runs';
  private readonly payRunItemsTable = 'pay_run_items';
  private readonly payPeriodsTable = 'pay_periods';
    /**
   * Get pay runs for a specific date range
   */
  async getPayRunsByPeriod(startDate: string, endDate: string, locationId?: string) {
    // First, find the pay period for these dates
    const { data: payPeriod, error: periodError } = await supabase
      .from(this.payPeriodsTable)
      .select('id')
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .maybeSingle();
    
    if (periodError) {
      throw periodError;
    }
    
    // If no pay period exists for these dates, return empty array
    if (!payPeriod) {
      return [];
    }
    
    // Then query pay runs that reference this pay period
    let query = supabase
      .from(this.payRunsTable)
      .select(`
        *,
        pay_period:${this.payPeriodsTable}(*)
      `)
      .eq('pay_period_id', payPeriod.id);
    
    if (locationId) {
      query = query.eq('location_id', locationId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data as (PayRun & { pay_period: any })[];
  }

  /**
   * Get a single pay run by ID with all its items
   */
  async getPayRunDetails(payRunId: string) {
    const { data, error } = await supabase
      .from(this.payRunsTable)
      .select(`
        *,
        pay_period:${this.payPeriodsTable}(*),
        items:${this.payRunItemsTable}(*)
      `)
      .eq('id', payRunId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as (PayRun & { pay_period: any, items: PayRunItem[] });
  }
  /**
   * Create a new pay run for a specific pay period, optionally only including unpaid services
   */  async createPayRun(payPeriodId: string, name: string, locationId?: string, onlyUnpaid: boolean = false) {
    // If this is a supplementary pay run, add a suffix to the name
    const suffix = onlyUnpaid ? " (Supplementary)" : "";
    
    // First, create the pay run record
    const { data: payRun, error: payRunError } = await supabase
      .from(this.payRunsTable)
      .insert({
        name: name + suffix,
        pay_period_id: payPeriodId,
        status: 'draft',
        location_id: locationId || null,
        is_supplementary: onlyUnpaid
      })
      .select()
      .single();
    
    if (payRunError) {
      throw payRunError;
    }

    // Then trigger the populate_pay_run_items function with the onlyUnpaid parameter
    const { error: populateError } = await supabase
      .rpc('populate_pay_run_items', { 
        pay_run_id_param: payRun.id,
        only_unpaid_param: onlyUnpaid
      });

    if (populateError) {
      // If population fails, we should clean up the pay run we just created
      await supabase
        .from(this.payRunsTable)
        .delete()
        .eq('id', payRun.id);
      
      throw populateError;
    }

    return payRun as PayRun;
  }
  /**
   * Update the status of a pay run
   */
  async updatePayRunStatus(payRunId: string, status: 'draft' | 'pending' | 'approved' | 'paid' | 'cancelled') {
    const updates: any = { status };
    
    // If marking as paid, also set the paid_date
    if (status === 'paid') {
      updates.paid_date = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from(this.payRunsTable)
      .update(updates)
      .eq('id', payRunId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Ensure all pay run items have the correct is_paid status
    // This is especially important when marking a pay run as 'paid'
    await supabase.rpc('ensure_pay_run_items_payment_status', { 
      pay_run_id_param: payRunId 
    });
    
    return data as PayRun;
  }

  /**
   * Get all items for a specific employee in a pay run
   */
  async getEmployeePayRunItems(payRunId: string, employeeId: string) {
    const { data, error } = await supabase
      .from(this.payRunItemsTable)
      .select('*')
      .eq('pay_run_id', payRunId)
      .eq('employee_id', employeeId);
    
    if (error) {
      throw error;
    }
    
    return data as PayRunItem[];
  }  /**
   * Add an adjustment to a pay run for an employee
   */
  async addAdjustment(payRunId: string, adjustment: AdjustmentData) {
    const amount = adjustment.isAddition 
      ? Math.abs(adjustment.amount) 
      : -Math.abs(adjustment.amount);
    
    // Map frontend compensation types to database-compatible types
    const mapCompensationType = (frontendType: string): string => {
      const typeMap: Record<string, string> = {
        'wages': 'salary',     // Map 'wages' to 'salary'
        'commission': 'commission', // Keep 'commission' as is
        'tips': 'tip',        // Map 'tips' to 'tip'
        'other': 'adjustment' // Map 'other' to 'adjustment'
      };
      
      return typeMap[frontendType] || 'adjustment';
    };
    
    const dbCompensationType = mapCompensationType(adjustment.compensationType);
    
    console.log('Adding adjustment:', {
      pay_run_id: payRunId,
      employee_id: adjustment.employeeId,
      compensation_type: dbCompensationType,
      amount,
      description: adjustment.description,
      source_type: 'manual'
    });
    
    // Use the custom database function that temporarily disables the trigger
    // This prevents the adjustment from being automatically marked as paid
    const { data, error } = await supabase.rpc(
      'add_adjustment_to_pay_run',
      {
        pay_run_id_param: payRunId,
        employee_id_param: adjustment.employeeId,
        compensation_type_param: dbCompensationType,
        amount_param: amount,
        description_param: adjustment.description,
        source_type_param: 'manual'
      }
    );
    
    if (error) {
      console.error('Error adding adjustment:', error);
      throw error;
    }
    
    console.log('Adjustment added successfully:', data);
    return data as PayRunItem;
  }/**
   * Delete an adjustment from a pay run
   */
  async deleteAdjustment(adjustmentId: string) {
    console.log('Deleting adjustment with ID:', adjustmentId);
    
    // First get the pay run ID so we can return it
    const { data: item, error: fetchError } = await supabase
      .from(this.payRunItemsTable)
      .select('pay_run_id, compensation_type, source_type')
      .eq('id', adjustmentId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching adjustment before deletion:', fetchError);
      throw fetchError;
    }
    
    const pay_run_id = item.pay_run_id;
    
    // Verify this is a manual adjustment that can be deleted
    if (item.source_type !== 'manual') {
      console.warn(`Attempted to delete non-manual adjustment (${item.source_type}) with ID: ${adjustmentId}`);
    }
    
    console.log('Found adjustment with pay_run_id:', pay_run_id, 'Type:', item.compensation_type);
    
    // Then delete the item
    const { error } = await supabase
      .from(this.payRunItemsTable)
      .delete()
      .eq('id', adjustmentId);
    
    if (error) {
      console.error('Error deleting adjustment:', error);
      throw error;
    }
    
    console.log('Adjustment deleted successfully');
    return { success: true, pay_run_id };
  }/**
   * Calculate the summary totals for a pay run
   */
  async getPayRunSummary(payRunId: string): Promise<PayRunSummary> {
    try {
      // If no payRunId provided, return a summary with zeros
      if (!payRunId) {
        return {
          earnings: 0,
          other: 0,
          total: 0,
          paid: 0,
          toPay: 0,
          total_employees: 0
        };
      }
      
      // First try the optimized server-side calculation via RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'calculate_pay_run_summary', 
        { pay_run_id_param: payRunId }
      );
      
      if (!rpcError && rpcData) {
        console.log('Pay run summary from RPC:', rpcData);
        return rpcData as PayRunSummary;
      }
      
      // If RPC fails, fall back to edge function
      console.log('RPC calculation failed, using edge function:', rpcError);
      const { data, error } = await supabase.functions.invoke('pay-run-summary', {
        body: { payRunId }
      });
      
      if (error) {
        console.error('Error calling pay-run-summary edge function:', error);
        throw error;
      }
      
      console.log('Pay run summary from edge function:', data);
      return data as PayRunSummary;
    } catch (err) {
      console.error('Failed to get pay run summary, falling back to local calculation:', err);
      
      // Fallback to local calculation if edge function fails
      return this.getPayRunSummaryLocal(payRunId);
    }
  }
  
  /**
   * Fallback method to calculate summary locally if edge function fails
   * @private
   */
  private async getPayRunSummaryLocal(payRunId: string): Promise<PayRunSummary> {
    // If no payRunId provided, return a summary with zeros
    if (!payRunId) {
      return {
        earnings: 0,
        other: 0,
        total: 0,
        paid: 0,
        toPay: 0,
        total_employees: 0
      };
    }
    
    // Get the pay run to check its status first
    const { data: payRunData, error: payRunError } = await supabase
      .from(this.payRunsTable)
      .select('status, is_supplementary')
      .eq('id', payRunId)
      .single();
    if (payRunError) {
      throw payRunError;
    }
      
    // Get pay run items that should be included in the calculation
    const { data, error } = await supabase
      .from(this.payRunItemsTable)
      .select('compensation_type, amount, is_paid')
      .eq('pay_run_id', payRunId);
    
    if (error) {
      throw error;
    }
    
    const items = data as { compensation_type: string; amount: number; is_paid: boolean }[];
    console.log('Pay run items:', items);
    // Calculate summary totals
    const summary: PayRunSummary = {
      earnings: 0,
      other: 0,
      total: 0,
      paid: 0,
      toPay: 0,
      total_employees: 0
    };
      // Calculate totals with paid/unpaid split
    items.forEach(item => {
      const amount = item.amount || 0;
      
      // Add to the appropriate category
      if (['salary', 'commission', 'tip'].includes(item.compensation_type)) {
        summary.earnings += amount;
      } else {
        summary.other += amount;
      }
      
      // Add to total
      summary.total += amount;
      
      // Add to paid/unpaid based on the is_paid flag
      if (item.is_paid || payRunData.status === 'paid') {
        summary.paid += amount;
      } else {
        summary.toPay += amount;
      }
    });
    console.log('Pay run summary:', summary);
    // For paid pay runs, ensure toPay is 0
    if (payRunData.status === 'paid') {
      summary.toPay = 0;
      summary.paid = summary.total;
    }
    
    // Count unique employees in the pay run
    const { data: uniqueEmployees, error: uniqueError } = await supabase
      .from(this.payRunItemsTable)
      .select('employee_id')
      .eq('pay_run_id', payRunId)
      .limit(1000); // Set a reasonable limit
    
    if (!uniqueError) {
      // Use a Set to count unique employee IDs
      const uniqueEmployeeIds = new Set(uniqueEmployees.map(item => item.employee_id));
      summary.total_employees = uniqueEmployeeIds.size;
    }
    
    return summary;
  }  /**
   * Process payments for selected employees in a pay run
   */
  async processPayments(payRunId: string, employeeIds: string[]) {
    // First, update the pay run status to 'paid'
    // This also updates is_paid flags via the updatePayRunStatus method
    await this.updatePayRunStatus(payRunId, 'paid');
    
    // Update the bookings payment status to ensure correct tracking
    // Get all services associated with this pay run
    const { data: payRunItems, error: itemsError } = await supabase
      .from(this.payRunItemsTable)
      .select('id, source_id, source_type')
      .eq('pay_run_id', payRunId)
      .eq('source_type', 'service');
      
    if (itemsError) {
      console.error('Error fetching pay run items:', itemsError);
    }
    
    // Mark all services in this pay run as paid
    if (payRunItems && payRunItems.length > 0) {
      const sourceIds = payRunItems
        .filter(item => item.source_id && item.source_type === 'service')
        .map(item => item.source_id);        // No need to update bookings as payment status is tracked in pay_run_items
        if (sourceIds.length > 0) {
          console.log(`Found ${sourceIds.length} service bookings associated with this pay run`);
        }
    }
    
    // Double-check that all pay run items have correct is_paid values
    // This ensures data consistency for payment calculations
    await supabase.rpc('ensure_pay_run_items_payment_status', { 
      pay_run_id_param: payRunId 
    });
    
    // In a real app, this would include additional payment processing logic
    return true;
  }

  /**
   * Recalculate commissions for a pay run
   */
  async recalculateCommissions(payRunId: string) {
    const { data, error } = await supabase.rpc('recalculate_commissions_for_pay_run', {
      pay_run_id_param: payRunId
    });
    
    if (error) {
      console.error('Error recalculating commissions:', error);
      throw error;
    }
    
    return true;
  }
}

export const payRunService = new PayRunService();