
export type AppointmentStatus = 
  | "pending" 
  | "confirmed" 
  | "canceled" 
  | "completed" 
  | "inprogress" 
  | "voided" 
  | "refunded" 
  | "partially_refunded" 
  | "noshow" 
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
  coupon_name?: string | null;
  coupon_amount?: number | null;
  original_appointment_id?: string | null;
  refunded_by?: string | null;
  original_total_price?: number | null;
  refund_notes?: string | null;
  refund_reason?: string | null;
  location?: string | null;
  location_id?: string | null;
  number_of_bookings?: number;
  transaction_type?: string;
  
  // Additional fields for membership integration
  membership_discount?: number;
  membership_id?: string | null;
  membership_name?: string | null;
  
  // Joined data
  bookings?: any[];
  tax?: any;
}
