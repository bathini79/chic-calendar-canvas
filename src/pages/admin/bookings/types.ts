
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
  service_locations?: {location_id: string}[];
  location_ids?: string[];
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
  package_locations?: {location_id: string}[];
  location_ids?: string[];
}

export interface Customer {
  id: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
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
}

export interface RefundData {
  appointment_id: string;
  reason: string;
  notes?: string;
  refundedBy?: string;
}

export interface TransactionDetails {
  id: string;
  status: AppointmentStatus;
  created_at: string;
  total_price: number;
  payment_method: string;
  originalSale?: Appointment;
  refunds?: Appointment[];
}
