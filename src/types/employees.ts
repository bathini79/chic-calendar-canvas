export interface Employee {
  id?: string;
  created_at?: string;
  updated_at?: string;
  name?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  status?: "active" | "inactive";
  auth_id?: string;
  employment_type?: "stylist" | "operations";
  employment_type_id?: string;
  commission_type?: "flat" | "tiered" | "none";
}

export interface FlatCommissionRule {
  id?: string;
  template_id?: string | null;
  employee_id?: string | null;
  service_id: string;
  percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface TieredCommissionSlab {
  id?: string;
  template_id?: string | null;
  employee_id?: string | null;
  min_amount: number;
  max_amount?: number | null;
  percentage: number;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface CommissionTemplate {
  id: string;
  name: string;
  description?: string | null;
  type: "flat" | "tiered";
  created_at?: string;
  updated_at?: string;
}
