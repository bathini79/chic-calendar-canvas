
export type AppointmentStatus = 
  | 'pending'
  | 'confirmed'
  | 'inprogress'
  | 'completed'
  | 'canceled'
  | 'noshow'
  | 'refunded'
  | 'voided'
  | 'booked'
  | 'partially_refunded';

export type DiscountType = 'none' | 'fixed' | 'percentage';

export interface Customer {
  id: string;
  full_name: string;
  email?: string;
  phone_number?: string;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  avatar?: string;
}

export interface Service {
  id: string;
  name: string;
  selling_price: number;
  duration: number;
  description?: string;
  category_id?: string;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  description?: string;
  duration?: number;
}

export interface Booking {
  id: string;
  service?: Service;
  package?: Package;
  employee?: Employee;
  price_paid: number;
  start_time?: string;
  end_time?: string;
  status?: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  customer?: Customer;
  start_time: string;
  end_time: string;
  total_price: number;
  status: AppointmentStatus;
  notes?: string;
  location?: string;
  bookings: Booking[];
  transaction_type?: 'sale' | 'refund';
  payment_method?: string;
  discount_type?: DiscountType;
  discount_value?: number;
  refund_reason?: string;
  refund_notes?: string;
}

export interface SelectedItem {
  id: string;
  serviceId?: string;
  packageId?: string;
  employeeId?: string;
  startTime: string;
  endTime: string;
  price: number;
}

export interface RefundData {
  reason: string;
  notes?: string;
}

export interface TransactionDetails {
  customerId: string;
  totalPrice: number;
  paymentMethod: string;
  discountType?: DiscountType;
  discountValue?: number;
  bookingData: any[];
}
