
export interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
}

export interface Service {
  id: string;
  name: string;
  selling_price: number;
  duration: number;
  description?: string;
  status?: string;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  status?: string;
  package_services?: {
    service: Service;
  }[];
}

export interface Booking {
  id: string;
  appointment_id: string;
  service_id?: string;
  package_id?: string;
  employee_id?: string;
  price_paid: number;
  status?: string;
  service?: Service;
  package?: Package;
}
