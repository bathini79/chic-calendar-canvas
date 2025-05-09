
export type AppointmentStatus = 
  | "confirmed" 
  | "canceled" 
  | "completed" 
  | "inprogress" 
  | "voided" 
  | "refunded" 
  | "partially_refunded" 
  | "noshow"  // standardizing to 'noshow' instead of 'no-show'
  | "booked";

export interface Appointment {
  id: string;
  customer_id: string;
  status: AppointmentStatus;
  start_time: string;
  end_time: string;
  total_price: number;
  total_duration?: number;
  notes?: string;
  payment_method?: string;
  discount_type?: string;
  discount_value?: number;
  tax_amount?: number;
  tax_id?: string | null;
  created_at?: string;
  updated_at?: string;
  coupon_id?: string | null;
  original_appointment_id?: string | null;
  refunded_by?: string | null;
  original_total_price?: number | null;
  refund_notes?: string | null;
  refund_reason?: string | null;
  location?: string | null;
  location_id?: string | null;
  location_name?: string; // Adding location_name property
  number_of_bookings?: number;
  transaction_type?: string;
  
  // Additional fields for membership integration
  membership_discount?: number;
  membership_id?: string | null;
  membership_name?: string | null;
  
  // Joined data
  bookings?: any[];
  tax?: any;
  customer?: any;
}
