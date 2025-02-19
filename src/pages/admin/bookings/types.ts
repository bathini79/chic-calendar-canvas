
export interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  selling_price: number;
  duration: number;
}

export interface Employee {
  id: string;
  name: string;
  avatar?: string;
}
