export enum SCREEN {
  SERVICE_SELECTION = "service_selection",
  CHECKOUT = "checkout",
  SUMMARY = "summary",
}

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

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  selling_price: number;
  original_price: number;
  category_id?: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  gender?: string;
  image_urls?: string[];
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  discount_type?: "none" | "fixed" | "percentage";
  discount_value?: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  image_urls?: string[];
  is_customizable?: boolean;
  customizable_services?: string[];
  categories?: any[];
  package_services?: any[];
}

export interface Customer {
  id: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
  memberships?: CustomerMembership[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  status: "active" | "inactive";
  employment_type: "stylist" | "operations";
  created_at: string;
  updated_at: string;
  avatar?: string;
}

export interface Booking {
  id: string;
  appointment_id: string;
  service_id?: string;
  package_id?: string;
  employee_id?: string;
  created_at: string;
  updated_at: string;
  price_paid: number;
  original_price?: number;
  status: AppointmentStatus;
  start_time: string;
  end_time?: string;
  refunded_at?: string;
  refund_notes?: string;
  refunded_by?: string;
  refund_reason?: string;
  service?: Service;
  package?: Package;
  employee?: Employee;
}

export interface Appointment {
  id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  total_price: number;
  discount_type: "none" | "fixed" | "percentage";
  discount_value: number;
  payment_method?: string;
  notes?: string;
  location?: string;
  number_of_bookings?: number;
  created_at: string;
  updated_at: string;
  original_appointment_id?: string;
  refund_notes?: string;
  transaction_type?: string;
  refunded_by?: string;
  original_total_price?: number;
  refund_reason?: string;
  total_duration?: number;
  customer?: Customer;
  bookings: Booking[];
  tax_amount?: number;
  coupon_id?: string;
  membership_id?: string;
  membership_name?: string;
  membership_discount?: number;
}

export interface RefundData {
  reason: "customer_dissatisfaction" | "service_quality_issue" | "scheduling_error" | 
          "health_concern" | "price_dispute" | "other" | "booking_error" | 
          "service_unavailable" | "customer_emergency" | "customer_no_show";
  notes: string;
  refundedBy: string;
}

export interface TransactionDetails {
  id: string;
  amount: number;
  status: AppointmentStatus;
  payment_method?: string;
  created_at: string;
  originalSale: Appointment;
  refunds: Appointment[];
}

export interface CustomerMembership {
  id: string;
  customer_id: string;
  membership_id: string;
  status: string;
  start_date: string;
  end_date: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  membership?: {
    id: string;
    name: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    applicable_services: string[];
    applicable_packages: string[];
    min_billing_amount: number | null;
    max_discount_value: number | null;
  };
}
