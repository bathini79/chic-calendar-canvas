import { Database } from '@/integrations/supabase/types';

// Define the RPC function types for commission operations
export type RPCCommissionDeleteAllForEmployee = {
  employee_id_param: string; // UUID passed as string
};

export type RPCCommissionSaveFlatRules = {
  employee_id_param: string; // UUID passed as string
  rules_json: Array<{
    service_id: string; // UUID passed as string
    percentage: number;
  }>;
};

export type RPCCommissionSaveTieredSlabs = {
  employee_id_param: string; // UUID passed as string
  slabs_json: Array<{
    min_amount: number;
    max_amount: number | null;
    percentage: number;
    order_index: number;
  }>;
};

// Legacy interface for backward compatibility
export interface CommissionRpcFunctions {
  delete_flat_commission_rules: (params: { employee_id_param: string }) => void;
  insert_flat_commission_rule: (params: { 
    employee_id_param: string;
    service_id_param: string;
    percentage_param: number;
  }) => string; // Returns UUID

  delete_tiered_commission_slabs: (params: { employee_id_param: string }) => void;
  insert_tiered_commission_slab: (params: { 
    employee_id_param: string;
    min_amount_param: number;
    max_amount_param: number | null;
    percentage_param: number;
    order_index_param: number;
  }) => string; // Returns UUID
}

// Export a namespace for all RPC types
export namespace RPCTypes {
  export type Functions = {
    commission_delete_all_for_employee: {
      Args: RPCCommissionDeleteAllForEmployee;
      Returns: void;
    };
    commission_save_flat_rules: {
      Args: RPCCommissionSaveFlatRules;
      Returns: void;
    };
    commission_save_tiered_slabs: {
      Args: RPCCommissionSaveTieredSlabs;
      Returns: void;
    };
  };
}
