
// Make sure this file is imported and used by all appointment-related components

export type AppointmentStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'inprogress' 
  | 'completed' 
  | 'canceled' 
  | 'noshow' 
  | 'booked' 
  | 'voided' 
  | 'refunded' 
  | 'partially_refunded';

export type RefundReason = 
  | 'customer_dissatisfaction' 
  | 'booking_error' 
  | 'service_unavailable' 
  | 'customer_no_show' 
  | 'customer_emergency' 
  | 'other'
  | 'service_quality_issue'
  | 'scheduling_error'
  | 'health_concern'
  | 'price_dispute';

export enum SCREEN {
  SERVICE_SELECTION = "SERVICE_SELECTION",
  CHECKOUT = "CHECKOUT",
  SUMMARY = "SUMMARY"
}

export interface Booking {
  id: string;
  appointment_id: string;
  service_id?: string;
  package_id?: string;
  employee_id?: string;
  price_paid: number;
  original_price?: number;
  start_time?: string;
  end_time?: string;
  status?: string;
  refund_reason?: RefundReason;
  refund_notes?: string;
  refunded_by?: string;
  refunded_at?: string;
  created_at?: string;
  updated_at?: string;
  service?: {
    id: string;
    name: string;
    selling_price: number;
    duration: number;
    description?: string;
    category_id?: string;
    status?: string;
    image_urls?: string[];
    [key: string]: any;
  };
  package?: {
    id: string;
    name: string;
    price: number;
    duration?: number;
    description?: string;
    status?: string;
    package_services?: {
      service: {
        id: string;
        name: string;
        duration: number;
        selling_price?: number;
        package_selling_price?: number;
      }
    }[];
    package_selling_price?: number;
    [key: string]: any;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    photo_url?: string;
    employment_type: 'stylist' | 'admin';
    status?: string;
    [key: string]: any;
  };
}

export interface Appointment {
  id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  discount_type?: 'none' | 'percentage' | 'fixed';
  discount_value?: number;
  payment_method?: 'cash' | 'online';
  status: AppointmentStatus;
  notes?: string;
  location?: string;
  transaction_type?: string;
  total_duration?: number;
  refund_reason?: string;
  refunded_by?: string;
  refund_notes?: string;
  original_total_price?: number;
  original_appointment_id?: string;
  number_of_bookings?: number;
  created_at?: string;
  updated_at?: string;
  customer?: {
    id: string;
    full_name?: string;
    email?: string;
    phone_number?: string;
    role?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: any;
  };
  bookings: Booking[];
}

// Add missing types that were causing build errors
export interface Customer {
  id: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  employment_type: 'stylist' | 'admin';
  status?: string;
  [key: string]: any;
}

export interface Service {
  id: string;
  name: string;
  selling_price: number;
  duration: number;
  description?: string;
  category_id?: string;
  status?: string;
  image_urls?: string[];
  [key: string]: any;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  duration?: number;
  description?: string;
  status?: string;
  package_selling_price?: number;
  package_services?: {
    service: {
      id: string;
      name: string;
      duration: number;
      selling_price?: number;
      package_selling_price?: number;
    }
  }[];
  [key: string]: any;
}

export interface RefundData {
  reason: RefundReason;
  notes?: string;
  amount?: number;
  refundedBy?: string;
}

export interface TransactionDetails {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method?: string;
  originalSale?: any;
  refunds?: any[];
  [key: string]: any;
}
