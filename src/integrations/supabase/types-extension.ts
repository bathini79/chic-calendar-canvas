import { Database } from './types';
import { CommissionRpcFunctions, RPCTypes } from '@/types/rpc';

// Extend the Database types with our custom types
declare module './types' {
  export interface Database {
    public: {
      Tables: {
        employees: {
          Row: {
            id: string;
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
          };
          Insert: {
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
            commission_template_id?: string | null;
          };
          Update: {
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
            commission_template_id?: string | null;
          };
        } & Database['public']['Tables']['employees'];
        commission_templates: {
          Row: {
            id: string;
            name: string;
            description?: string;
            type: 'flat' | 'tiered';
            created_at?: string;
            updated_at?: string;
          };
          Insert: {
            id?: string;
            name: string;
            description?: string;
            type: 'flat' | 'tiered';
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            name?: string;
            description?: string;
            type?: 'flat' | 'tiered';
            created_at?: string;
            updated_at?: string;
          };
        };
        flat_commission_rules: {
          Row: {
            id: string;
            template_id?: string;
            employee_id?: string;
            service_id: string;
            percentage: number;
            created_at?: string;
            updated_at?: string;
          };
          Insert: {
            id?: string;
            template_id?: string;
            employee_id?: string;
            service_id: string;
            percentage: number;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            template_id?: string;
            employee_id?: string;
            service_id?: string;
            percentage?: number;
            created_at?: string;
            updated_at?: string;
          };
        };
        tiered_commission_slabs: {
          Row: {
            id: string;
            template_id?: string;
            employee_id?: string;
            min_amount: number;
            max_amount?: number;
            percentage: number;
            order_index: number;
            created_at?: string;
            updated_at?: string;
          };
          Insert: {
            id?: string;
            template_id?: string;
            employee_id?: string;
            min_amount: number;
            max_amount?: number;
            percentage: number;
            order_index: number;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            template_id?: string;
            employee_id?: string;
            min_amount?: number;
            max_amount?: number;
            percentage?: number;
            order_index?: number;
            created_at?: string;
            updated_at?: string;
          };
        };
      };      Functions: {
        // Legacy functions for backward compatibility
        delete_flat_commission_rules: CommissionRpcFunctions['delete_flat_commission_rules'];
        insert_flat_commission_rule: CommissionRpcFunctions['insert_flat_commission_rule'];
        delete_tiered_commission_slabs: CommissionRpcFunctions['delete_tiered_commission_slabs'];
        insert_tiered_commission_slab: CommissionRpcFunctions['insert_tiered_commission_slab'];
        
        // New consolidated commission functions
        commission_delete_all_for_employee: RPCTypes.Functions['commission_delete_all_for_employee'];
        commission_save_flat_rules: RPCTypes.Functions['commission_save_flat_rules'];
        commission_save_tiered_slabs: RPCTypes.Functions['commission_save_tiered_slabs'];
      } & Database['public']['Functions'];
    };
  }
}
