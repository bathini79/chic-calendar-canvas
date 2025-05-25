// Database schema types for payroll related tables

// Employee compensation settings table type
export interface EmployeeCompensationSetting {
  id: string;
  employee_id: string;
  base_amount: number;
  effective_from: string; // ISO date string
  effective_to: string | null; // ISO date string
  created_at: string;
  updated_at: string;
}

// Pay periods table type
export interface PayPeriod {
  id: string;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  status: 'draft' | 'active' | 'closed';
  name: string;
  team_id: string;
  created_at: string;
  updated_at: string;
}

// Pay runs table type
export interface PayRun {
  id: string;
  pay_period_id: string;
  status: 'draft' | 'pending' | 'approved' | 'paid';
  total_amount: number;
  created_at: string;
  updated_at: string;
  paid_at?: string;
}

// Pay run items table type
export interface PayRunItem {
  id: string;
  pay_run_id: string;
  employee_id: string;
  base_amount: number;
  adjustments: number;
  final_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

// Augmented time off request type with leave_type field
export interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  leave_type: 'paid' | 'unpaid';
  created_at: string;
  updated_at: string;
}

// Closed periods (holidays) type
export interface ClosedPeriod {
  id: string;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  description: string;
  location_ids: string[]; // Array of location IDs
  created_at: string;
  updated_at: string;
}