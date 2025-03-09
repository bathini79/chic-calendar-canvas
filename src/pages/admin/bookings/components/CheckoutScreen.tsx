
import React from 'react';
import { useBooking } from '../context/BookingContext';
import { CheckoutSection } from './CheckoutSection';

export const CheckoutScreen: React.FC = () => {
  const {
    newAppointmentId,
    selectedCustomer,
    selectedServices,
    selectedPackages,
    services,
    packages,
    discountType,
    discountValue,
    paymentMethod,
    appointmentNotes,
    selectedStylists,
    selectedTime,
    handleSaveAppointment,
    handleRemoveService,
    handleRemovePackage,
    handleBackToServices,
    handlePaymentComplete,
    setDiscountType,
    setDiscountValue,
    setPaymentMethod,
    setAppointmentNotes,
    customizedServices,
  } = useBooking();

  const selectedTimeSlots = { [newAppointmentId || '']: selectedTime || '' };

  return (
    <CheckoutSection
      appointmentId={newAppointmentId}
      selectedCustomer={selectedCustomer}
      selectedServices={selectedServices}
      selectedPackages={selectedPackages}
      services={services || []}
      packages={packages || []}
      discountType={discountType}
      discountValue={discountValue}
      paymentMethod={paymentMethod}
      notes={appointmentNotes}
      onDiscountTypeChange={setDiscountType}
      onDiscountValueChange={setDiscountValue}
      onPaymentMethodChange={setPaymentMethod}
      onNotesChange={setAppointmentNotes}
      onPaymentComplete={handlePaymentComplete}
      selectedStylists={selectedStylists}
      selectedTimeSlots={selectedTimeSlots}
      onSaveAppointment={handleSaveAppointment}
      onRemoveService={handleRemoveService}
      onRemovePackage={handleRemovePackage}
      onBackToServices={handleBackToServices}
      customizedServices={customizedServices}
      isExistingAppointment={false}
    />
  );
};
