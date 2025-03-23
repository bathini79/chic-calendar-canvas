
// Define all the types needed for the bookings system

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'refunded';

export type RefundReason = 'customer_dissatisfaction' | 'service_issue' | 'scheduling_conflict' | 'price_dispute' | 'other';

export enum SCREEN {
  CUSTOMER_SELECTION = "CUSTOMER_SELECTION",
  SERVICE_SELECTION = "SERVICE_SELECTION",
  CHECKOUT = "CHECKOUT",
  SUMMARY = "SUMMARY"
}

export interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  employment_type: 'stylist' | 'operations';
  phone?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  selling_price: number;
  duration: number;
  [key: string]: any;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  [key: string]: any;
}

export interface Booking {
  id: string;
  appointment_id: string;
  service_id?: string;
  package_id?: string;
  employee_id?: string;
  price_paid: number;
  status: string;
  service?: Service;
  package?: Package;
  employee?: Employee;
  created_at: string;
  updated_at: string;
}

export interface RefundData {
  appointmentId: string;
  reason: RefundReason;
  notes?: string;
  selectedBookings?: string[];
}

export interface Appointment {
  id: string;
  customer_id: string;
  customer?: Customer;
  start_time: string;
  end_time: string;
  total_price: number;
  status: AppointmentStatus;
  payment_method: 'cash' | 'card' | 'online';
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  notes?: string;
  bookings: Booking[];
  location?: string;
  created_at: string;
  updated_at: string;
  number_of_bookings?: number;
  original_total_price?: number;
  total_duration?: number;
  tax_amount?: number;
  coupon_id?: string;
  membership_discount?: number;
  membership_id?: string;
  membership_name?: string;
}

export interface CustomerMembership {
  id: string;
  customer_id: string;
  membership_id: string;
  start_date: string;
  end_date: string;
  status: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  membership: {
    id: string;
    name: string;
    discount_type: string;
    discount_value: number;
    applicable_services?: string[];
    applicable_packages?: string[];
    min_billing_amount?: number;
    max_discount_value?: number;
  };
}
