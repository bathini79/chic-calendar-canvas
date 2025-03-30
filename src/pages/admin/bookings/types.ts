
export type AppointmentStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'canceled' 
  | 'completed' 
  | 'no-show'  // Note: This should be 'noshow' to match the system type
  | 'noshow' 
  | 'inprogress'
  | 'voided'
  | 'refunded'
  | 'partially_refunded'
  | 'booked';

export type Appointment = {
  id: string;
  customer_id: string;
  location_id: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  total_price: number;
  original_total_price?: number;
  discount_type: DiscountType;
  discount_value: number;
  payment_method: PaymentMethod;
  tax_amount: number;
  membership_discount: number;
  membership_id: string | null;
  membership_name: string | null;
  created_at?: string;
  updated_at?: string;
  transaction_type?: string;
  original_appointment_id?: string;
  coupon_id?: string | null;
  refund_reason?: string;
  refund_notes?: string;
  refunded_by?: string;
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
  phone?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  admin_created?: boolean;
  phone_verified?: boolean;
  role?: string;
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
  avatar?: string;
  photo_url?: string;
  status?: string;
};

export type Booking = {
  id: string;
  appointment_id: string;
  service_id: string | null;
  package_id: string | null;
  employee_id: string | null;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed' | 'no-show' | 'noshow' | 'refunded';
  price: number;
  price_paid?: number;
  original_price?: number;
  created_at: string;
  updated_at: string;
  service?: Service | null;
  package?: Package | null;
  employee?: Employee | null;
};

export enum SCREEN {
  SERVICE_SELECTION = "service_selection",
  CHECKOUT = "checkout",
  SUMMARY = "summary"
}

export type RefundData = {
  reason: string;
  notes: string;
  refundedBy: string;
};

export type TransactionDetails = {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  originalSale: Appointment;
  refunds: Appointment[];
};

export type SummaryViewProps = {
  appointmentId?: string;
  customer?: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
  };
  totalPrice?: number;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    type: string;
  }>;
  paymentMethod?: PaymentMethod;
  onAddAnother?: () => void;
  receiptNumber?: string;
  taxAmount?: number;
  subTotal?: number;
  membershipName?: string;
  membershipDiscount?: number;
  children?: React.ReactNode;
};

export type PaymentMethod = "cash" | "online" | "card";
export type DiscountType = "none" | "percentage" | "fixed";
