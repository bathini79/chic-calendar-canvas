export interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'customer' | 'admin';
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
}

export interface Appointment {
  id: string;
  customer: Customer;
  status: string;
  start_time: string;
  end_time: string;
  total_price: number;
  payment_method?: 'cash' | 'online';
  discount_type?: 'none' | 'percentage' | 'fixed';
  discount_value?: number;
  notes?: string;
  bookings: Booking[];
}

export interface Booking {
  id: string;
  appointment_id: string;
  service_id?: string;
  package_id?: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  status: string;
  price_paid: number;
  service?: Service;
  package?: Package;
  employee: Employee;
}

export interface CartItem {
  type: 'service' | 'package';
  id: string;
  name: string;
  duration: number;
  price: number;
  customized_services?: string[];
}
