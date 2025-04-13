export type Appointment = {
  id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  location: string | null;
  notes: string | null;
  status: AppointmentStatus;
  total_price: number;
  discount_type: "none" | "percentage" | "fixed";
  discount_value: number;
  payment_method: string;
  number_of_bookings: number;
  tax_amount: number;
  tax_id: string | null;
  coupon_id: string | null;
  coupon_name: string | null;
  coupon_amount: number;
  membership_discount: number;
  membership_id: string | null;
  membership_name: string | null;
  points_earned: number;
  points_redeemed: number;
  points_discount_amount: number;
};

export type Service = {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  original_price: number;
  selling_price: number;
  duration: number;
  category_id: string | null;
  photo_url: string | null;
};

export type Package = {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  photo_url: string | null;
  package_services?: any[];
};

export type Employee = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  phone: string;
  employment_type: string;
  status: string;
  avatar: string;
  is_active: boolean;
  photo_url: string | null;
};

export type Customer = {
  id: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  wallet_balance?: number;
  cashback_balance?: number;
};

export type Location = {
  id: string;
  created_at: string;
  name: string;
  address: string;
  phone_number: string;
  is_active: boolean;
};

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show";

export enum SCREEN {
  SERVICES,
  CHECKOUT,
}
