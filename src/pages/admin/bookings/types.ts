
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
  bookings?: Booking[];
  customer?: Customer;
};

export type Booking = {
  id: string;
  appointment_id: string;
  service_id?: string;
  package_id?: string;
  employee_id?: string;
  start_time?: string;
  end_time?: string;
  status: string;
  price_paid: number;
  original_price: number;
  service?: Service;
  package?: Package;
  employee?: Employee;
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
  is_customizable?: boolean;
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

export type LocationHours = {
  id: string;
  location_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
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
  SUMMARY,
  SERVICE_SELECTION
}

export type LoyaltyProgramSettings = {
  id: string;
  enabled: boolean;
  points_per_spend: number;
  point_value: number;
  min_redemption_points: number;
  min_billing_amount: number | null;
  apply_to_all: boolean;
  applicable_services: string[] | null;
  applicable_packages: string[] | null;
  points_validity_days: number | null;
  cashback_validity_days: number | null;
  max_redemption_type: "fixed" | "percentage" | null;
  max_redemption_points: number | null;
  max_redemption_percentage: number | null;
};
