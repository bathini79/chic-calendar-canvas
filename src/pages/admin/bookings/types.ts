
export interface Customer {
  id: string;
  full_name: string;
  email: string;
}

export interface Appointment {
  id: string;
  customer: Customer;
  status: string;
  start_time: string;
  end_time: string;
  bookings: Booking[];
}

export interface Booking {
  id: string;
  employee: Employee;
  service?: Service;
  package?: Package;
  start_time: string;
  end_time: string;
}

export interface Employee {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  selling_price: number;
}

export interface Package {
  id: string;
  name: string;
  duration: number;
  price: number;
}
