export interface EmployeeCommissionSettings {
  id: string;
  employee_id: string;
  commission_type: 'flat' | 'tiered' | 'template';
  global_commission_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface TieredCommissionSlab {
  id: string;
  employee_id: string;
  min_amount: number;
  max_amount: number;
  percentage: number;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface FlatCommissionRule {
  id: string;
  employee_id: string;
  service_id: string;
  percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface TieredSlab {
  id: string;
  min_amount: number;
  max_amount: number;
  percentage: number;
  order: number;
}
