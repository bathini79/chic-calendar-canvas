
import React from "react";
import { Button } from "@/components/ui/button";
import { useBooking } from "../context/BookingContext";
import { ServiceSelector } from "./ServiceSelector";

export const ServiceSelectionScreen: React.FC = () => {
  const {
    handleServiceSelect,
    handlePackageSelect,
    handleStylistSelect,
    handleCustomServiceToggle,
    selectedServices,
    selectedPackages,
    selectedStylists,
    handleProceedToCheckout,
    handleSaveAppointment,
    services,
    packages,
    customizedServices,
  } = useBooking();

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-shrink-0">
        <h3 className="text-lg font-semibold">Select Services</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        <ServiceSelector
          onServiceSelect={handleServiceSelect}
          onPackageSelect={handlePackageSelect}
          onStylistSelect={handleStylistSelect}
          selectedServices={selectedServices}
          selectedPackages={selectedPackages}
          selectedStylists={selectedStylists}
          stylists={[]} // This will be populated from props when used
          onCustomPackage={handleCustomServiceToggle}
          customizedServices={customizedServices}
        />
      </div>

      <div className="p-6 border-t mt-auto flex justify-end gap-4">
        <Button variant="outline" onClick={handleSaveAppointment}>
          Save Appointment
        </Button>
        <Button
          className="bg-black text-white"
          onClick={handleProceedToCheckout}
        >
          Checkout
        </Button>
      </div>
    </div>
  );
};
