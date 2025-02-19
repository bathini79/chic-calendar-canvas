
import { useState } from 'react';
import type { Customer } from '../types';

export function useAppointmentState() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [appointmentNotes, setAppointmentNotes] = useState("");

  const resetState = () => {
    setSelectedCustomer(null);
    setShowCreateForm(false);
    setSelectedServices([]);
    setSelectedPackages([]);
    setSelectedStylists({});
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setNotes("");
    setPaymentMethod("cash");
    setDiscountType("none");
    setDiscountValue(0);
    setAppointmentNotes("");
  };

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
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    notes,
    setNotes,
    paymentMethod,
    setPaymentMethod,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    appointmentNotes,
    setAppointmentNotes,
    resetState,
  };
}
