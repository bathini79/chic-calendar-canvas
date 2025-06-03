import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Custom hook for handling commission-related operations
 */
export function useCommissionFunctions() {
  /**
   * Delete all commission data for an employee
   */
  const deleteAllCommissions = useCallback(async (employeeId: string) => {
    return supabase.rpc('commission_delete_all_for_employee', {
      employee_id_param: employeeId
    });
  }, []);

  /**
   * Save flat commission rules for an employee
   */
  const saveFlatCommissionRules = useCallback(async (
    employeeId: string, 
    rules: Array<{ service_id: string, percentage: number }>
  ) => {
    return supabase.rpc('commission_save_flat_rules', {
      employee_id_param: employeeId,
      rules_json: rules
    });
  }, []);

  /**
   * Save tiered commission slabs for an employee
   */
  const saveTieredCommissionSlabs = useCallback(async (
    employeeId: string, 
    slabs: Array<{
      min_amount: number,
      max_amount: number | null,
      percentage: number,
      order_index: number
    }>
  ) => {
    return supabase.rpc('commission_save_tiered_slabs', {
      employee_id_param: employeeId,
      slabs_json: slabs
    });
  }, []);

  /**
   * Check if the required commission RPC functions are available
   */
  const checkRpcFunctionsAvailable = useCallback(async (): Promise<boolean> => {
    try {
      // Attempt to call a function with invalid params (just to see if it exists)
      // We expect an error but not a 404/function-not-found error
      const { error } = await supabase.rpc('commission_delete_all_for_employee', {
        employee_id_param: '00000000-0000-0000-0000-000000000000'
      });
      
      // If we get any error other than "function not found", then the function exists
      return !error || !error.message.includes('function not found');
    } catch (error) {
      console.error('Error checking RPC functions availability:', error);
      return false;
    }
  }, []);

  return {
    deleteAllCommissions,
    saveFlatCommissionRules,
    saveTieredCommissionSlabs,
    checkRpcFunctionsAvailable
  };
}
