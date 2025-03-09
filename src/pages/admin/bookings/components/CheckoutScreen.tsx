
import React from "react";
import { CheckoutSection } from "./CheckoutSection";
import { useAppointmentWorkflow } from "../context/AppointmentWorkflowContext";
import { Service, Package } from "../types";

interface CheckoutScreenProps {
  services: Service[];
  packages: Package[];
  onSaveAppointment: () => Promise<string | null>;
}

export function CheckoutScreen({
  services,
  packages,
  onSaveAppointment
}: CheckoutScreenProps) {
  const {
    selectedCustomer,
    selectedServices,
    selectedPackages,
    discountType,
    discountValue,
    paymentMethod,
    appointmentNotes,
    setDiscountType,
    setDiscountValue,
    setPaymentMethod,
    setAppointmentNotes,
    handlePaymentComplete,
    selectedStylists,
    selectedTime,
    newAppointmentId,
    handleRemoveService,
    handleRemovePackage,
    handleBackToServices,
    customizedServices
  } = useAppointmentWorkflow();

  return (
    <CheckoutSection
      appointmentId={newAppointmentId}
      selectedCustomer={selectedCustomer}
      selectedServices={selectedServices}
      selectedPackages={selectedPackages}
      services={services}
      packages={packages}
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
      selectedTimeSlots={{ [newAppointmentId || '']: selectedTime }}
      onSaveAppointment={onSaveAppointment}
      onRemoveService={handleRemoveService}
      onRemovePackage={handleRemovePackage}
      onBackToServices={handleBackToServices}
      customizedServices={customizedServices}
      isExistingAppointment={false}
    />
  );
}
