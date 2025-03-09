
export interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number?: string | null;
  role: 'customer' | 'admin' | 'employee' | 'superadmin';
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  employment_type: 'stylist' | 'admin';
  status: 'active' | 'inactive';
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  selling_price: number;
  status: 'active' | 'inactive' | 'archived';
  category_id: string;
  gender: string;
  image_urls: string[];
  original_price: number;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  is_customizable: boolean;
  status: 'active' | 'inactive' | 'archived';
  categories: string[];
  customizable_services: string[];
  discount_type: string;
  discount_value: number;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  services?: string[];
  package_services?: Array<{
    service: Service;
    package_selling_price?: number;
  }>;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'canceled' | 'completed' | 'inprogress' | 'voided' | 'refunded' | 'partially_refunded' | 'noshow' | 'booked';

export type DiscountType = 'none' | 'percentage' | 'fixed';

export interface Appointment {
  id: string;
  customer_id: string;
  customer?: Customer;
  status: AppointmentStatus;
  start_time: string;
  end_time: string;
  total_price: number;
  payment_method: string;
  discount_type: DiscountType | string;
  discount_value: number;
  notes?: string;
  number_of_bookings: number;
  original_total_price?: number;
  total_duration: number;
  bookings: Booking[];
  created_at: string;
  updated_at: string;
  refund_reason?: string;
  refunded_by?: string;
  refund_notes?: string;
  transaction_type: 'sale' | 'refund';
  original_appointment_id?: string;
}

export interface Booking {
  id: string;
  appointment_id: string;
  service_id?: string;
  package_id?: string;
  employee_id: string;
  employee: Employee;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  price_paid: number;
  original_price?: number;
  service?: Service;
  package?: Package;
  refund_reason?: 'customer_dissatisfaction' | 'service_quality_issue' | 'scheduling_error' | 'health_concern' | 'price_dispute' | 'other';
  refund_notes?: string;
  refunded_by?: string;
  refunded_at?: string;
  package_selling_price?: number;
}

export interface RefundData {
  reason: 'customer_dissatisfaction' | 'service_quality_issue' | 'scheduling_error' | 'health_concern' | 'price_dispute' | 'other';
  notes?: string;
  refundedBy: string;
}

export interface TransactionDetails {
  originalSale: Appointment;
  refunds: Appointment[];
}

export const SCREEN = {
  SERVICE_SELECTION: "SERVICE_SELECTION",
  CHECKOUT: "CHECKOUT",
  SUMMARY: "SUMMARY"
} as const;

export type ScreenType = (typeof SCREEN)[keyof typeof SCREEN];
