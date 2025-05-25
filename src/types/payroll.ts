import { 
  EmployeeCompensationSetting, 
  PayPeriod, 
  PayRun, 
  PayRunItem, 
  TimeOffRequest, 
  ClosedPeriod 
} from './payroll-db';

// Frontend types for payroll components

// Employee compensation form data
export interface CompensationFormData {
  base_amount: number;
  effective_from: Date;
}

// Pay period configuration
export interface PayPeriodConfig {
  frequency: 'monthly' | 'custom';
  start_day_of_month?: number; // For monthly periods
  custom_days?: number; // For custom period lengths
}

// Time off request form data with leave type
export interface TimeOffRequestFormData {
  employee_id: string;
  start_date: Date;
  end_date: Date;
  reason: string;
  leave_type: 'paid' | 'unpaid';
}

// Closed period form data
export interface ClosedPeriodFormData {
  start_date: Date;
  end_date: Date;
  description: string;
  all_locations: boolean;
  location_ids: string[];
}

// Employee compensation history entry
export interface CompensationHistoryEntry {
  id: string;
  base_amount: number;
  effective_from: Date;
  effective_to: Date | null;
  created_at: Date;
}

// Pay run summary statistics
export interface PayRunSummary {
  total_employees: number;
  total_amount: number;
  total_paid_leave_days: number;
  total_unpaid_leave_days: number;
}