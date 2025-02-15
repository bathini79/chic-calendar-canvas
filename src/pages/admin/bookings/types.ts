
export interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
}
