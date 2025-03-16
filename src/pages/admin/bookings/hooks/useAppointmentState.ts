
import { useState } from 'react';
import { Customer, SCREEN } from '../types';

interface UseAppointmentStateProps {
  initialDate?: Date;
  initialTime?: string;
  initialAppointment?: any;
}

export function useAppointmentState({
  initialDate,
  initialTime,
  initialAppointment
}: UseAppointmentStateProps = {}) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(initialAppointment?.customer || {} as Customer);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>(
    initialAppointment?.bookings
      ?.filter((b: any) => b.service_id)
      .map((b: any) => b.service_id) || []
  );
  const [selectedPackages, setSelectedPackages] = useState<string[]>(
    initialAppointment?.bookings
      ?.filter((b: any) => b.package_id)
      .map((b: any) => b.package_id) || []
  );
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>(
    initialAppointment?.bookings?.reduce((acc: Record<string, string>, booking: any) => {
      if (booking.service_id && booking.employee_id) {
        acc[booking.service_id] = booking.employee_id;
      } else if (booking.package_id && booking.employee_id) {
        acc[booking.package_id] = booking.employee_id;
      }
      return acc;
    }, {}) || {}
  );
  
  // Add the missing fields for appointment state
  const [activeScreen, setActiveScreen] = useState<SCREEN>(SCREEN.SERVICE_SELECTION);
  const [appointmentId, setAppointmentId] = useState<string | undefined>(initialAppointment?.id);
  const [appointmentDate, setAppointmentDate] = useState<Date>(
    initialDate || (initialAppointment?.start_time ? new Date(initialAppointment.start_time) : new Date())
  );
  const [appointmentTime, setAppointmentTime] = useState<string>(
    initialTime || 
    (initialAppointment?.start_time
      ? new Date(initialAppointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : '09:00')
  );
  const [discountType, setDiscountType] = useState<'none' | 'fixed' | 'percentage'>(
    (initialAppointment?.discount_type as 'none' | 'fixed' | 'percentage') || 'none'
  );
  const [discountValue, setDiscountValue] = useState<number>(initialAppointment?.discount_value || 0);
  const [paymentMethod, setPaymentMethod] = useState<string>(initialAppointment?.payment_method || 'cash');
  const [notes, setNotes] = useState<string>(initialAppointment?.notes || '');
  const [customizedServices, setCustomizedServices] = useState<Record<string, string[]>>({});

  return {
    selectedCustomer,
    setSelectedCustomer,
    showCreateForm,
    setShowCreateForm,
    selectedServices,
    setSelectedServices,
    selectedPackages,
    setSelectedPackages,
    selectedStylists,
    setSelectedStylists,
    activeScreen,
    setActiveScreen,
    appointmentId,
    setAppointmentId,
    appointmentDate,
    setAppointmentDate,
    appointmentTime,
    setAppointmentTime,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    paymentMethod,
    setPaymentMethod,
    notes,
    setNotes,
    customizedServices,
    setCustomizedServices
  };
}
