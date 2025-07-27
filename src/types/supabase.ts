export type Database = {
  public: {
    Tables: {
      employee_compensation_settings: {
        Row: {
          id: string;
          employee_id: string;
          base_amount: number;
          working_days: number;
          working_hours: number;
          hourly_rate: number;
          effective_from: string;
          effective_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          base_amount: number;
          working_days: number;
          working_hours: number;
          hourly_rate: number;
          effective_from: string;
          effective_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          base_amount?: number;
          working_days?: number;
          working_hours?: number;
          hourly_rate?: number;
          effective_from?: string;
          effective_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ... other tables
    };
  };
};
