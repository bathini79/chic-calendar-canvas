
export interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number?: string | null;
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
  services_categories: {
    categories: {
      id: string;
      name: string;
    };
  }[];
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
  package_services: {
    service: {
      id: string;
      name: string;
      selling_price: number;
      duration: number;
    };
  }[];
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
  status: 'pending' | 'confirmed' | 'canceled' | 'completed' | 'inprogress';
  start_time: string;
  end_time: string;
  total_price: number;
  payment_method: 'cash' | 'online' | null;
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  notes?: string;
  bookings: Booking[];
  customer_id: string;
  number_of_bookings: number;
  total_duration: number;
  original_total_price?: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  appointment_id: string;
  service_id?: string;
  package_id?: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed' | 'inprogress';
  price_paid: number;
  original_price?: number;
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
