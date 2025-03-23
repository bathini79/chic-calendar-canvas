export type AppointmentStatus = 'pending' | 'confirmed' | 'canceled' | 'completed' | 'no-show';

export type Appointment = {
  id: string;
  customer_id: string;
  location_id: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  total_price: number;
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  payment_method: string;
  tax_amount: number;
  membership_discount: number;
  membership_id: string | null;
  membership_name: string | null;
  customer: any;
  bookings: any[];
};

export type Service = {
  id: string;
  name: string;
  description: string;
  duration: number;
  selling_price: number;
  cost_price: number;
  category_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
  };
};

export type Package = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  is_active: boolean;
  is_customizable: boolean;
  created_at: string;
  updated_at: string;
  package_services: Array<{
    id: string;
    package_id: string;
    service_id: string;
    package_selling_price: number | null;
    service: Service;
  }>;
};

export type Customer = {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  employment_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  appointment_id: string;
  service_id: string | null;
  package_id: string | null;
  employee_id: string | null;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed' | 'no-show';
  price: number;
  created_at: string;
  updated_at: string;
  service?: Service | null;
  package?: Package | null;
  employee?: Employee | null;
};
