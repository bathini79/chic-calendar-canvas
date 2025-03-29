
import { AppointmentStatus } from '@/types/appointment';

export type { AppointmentStatus };

export type PaymentMethod = "cash" | "card" | "online" | "wallet" | "bank_transfer";

export interface Service {
  id: string;
  name: string;
  description?: string;
  selling_price: number;
  original_price: number;
  duration: number;
  status?: 'active' | 'inactive' | 'archived';
  image_urls?: string[];
  category_id?: string;
  gender?: string;
}

export interface ServiceCategory {
  id: string;
  service_id?: string;
  category_id?: string;
  category?: {
    id: string;
    name: string;
  };
}

export interface PackageService {
  id: string;
  package_id: string;
  service_id: string;
  package_selling_price: number;
  service: Service;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  status?: 'active' | 'inactive' | 'archived';
  discount_type?: string;
  discount_value?: number;
  image_urls?: string[];
  categories?: string[];
  is_customizable?: boolean;
  customizable_services?: string[];
  is_active?: boolean;
  package_services: PackageService[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employment_type: 'stylist' | 'operations';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  avatar?: string;
  is_active?: boolean;
  photo_url: string | null;
}

export interface Customer {
  id: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
}

export interface Booking {
  id: string;
  appointment_id: string;
  service_id?: string;
  package_id?: string;
  employee_id?: string;
  start_time?: string;
  end_time?: string;
  price_paid: number;
  original_price?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  service?: Service;
  package?: Package;
  employee?: Employee;
}

export interface Appointment {
  id: string;
  customer_id: string;
  customer?: Customer;
  status: AppointmentStatus;
  start_time: string;
  end_time: string;
  total_price: number;
  total_duration?: number;
  notes?: string;
  payment_method?: PaymentMethod;
  discount_type?: 'none' | 'percentage' | 'fixed';
  discount_value?: number;
  tax_amount?: number;
  tax_id?: string | null;
  transaction_type?: 'sale' | 'refund';
  location?: string;
  location_id?: string;
  bookings: Booking[];
}

// For fixed appointments on the calendar
export interface AppointmentBlock {
  id: string;
  employeeId: string;
  startTime: number;
  endTime: number;
  appointment: Appointment;
}

export interface RefundData {
  reason: string;
  notes: string;
  refundedBy: string;
}

export interface TransactionDetails {
  id: string;
  amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
  originalSale: Appointment;
  refunds: Appointment[];
}

export enum SCREEN {
  SERVICE_SELECTION,
  CHECKOUT,
  SUMMARY,
}
