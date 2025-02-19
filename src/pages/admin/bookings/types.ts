
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
}

export interface CartItem {
  type: 'service' | 'package';
  id: string;
  name: string;
  duration: number;
  price: number;
  customized_services?: string[];
}
