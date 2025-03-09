
import React from 'react';
import { Button } from "@/components/ui/button";
import { ServiceSelector } from './ServiceSelector';
import { useAppointmentWorkflow } from '../context/AppointmentWorkflowContext';
import { toast } from 'sonner';

interface ServiceSelectionScreenProps {
  employees: any[];
}

export const ServiceSelectionScreen: React.FC<ServiceSelectionScreenProps> = ({
  employees
}) => {
  const {
    handleServiceSelect,
    handlePackageSelect,
    handleStylistSelect,
    selectedServices,
    selectedPackages,
    selectedStylists,
    handleProceedToCheckout,
    handleCustomServiceToggle,
    customizedServices,
    handleSaveAppointment,
    selectedCustomer
  } = useAppointmentWorkflow();

  const handleProceed = () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return;
    }

    // Enhanced validation - check if all selected services and packages have stylists assigned
    const servicesWithoutStylists = selectedServices.filter(
      serviceId => !selectedStylists[serviceId]
    );
    
    const packagesWithoutStylists = selectedPackages.filter(
      packageId => !selectedStylists[packageId]
    );

    if (servicesWithoutStylists.length > 0 || packagesWithoutStylists.length > 0) {
      toast.error("Please select a stylist for each service and package");
      return;
    }

    // If all validations pass, proceed to checkout
    handleProceedToCheckout();
  };

  const handleSave = async () => {
    // Same validations before saving
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return;
    }

    // Basic stylist validation for save
    const hasAllStylists = [...selectedServices, ...selectedPackages].every(
      itemId => !!selectedStylists[itemId]
    );

    if (!hasAllStylists) {
      toast.error("Please select a stylist for each service/package");
      return;
    }

    // All validations passed, save the appointment
    await handleSaveAppointment();
  };

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
          stylists={employees}
          onCustomPackage={handleCustomServiceToggle}
          customizedServices={customizedServices}
        />
      </div>

      <div className="p-6 border-t mt-auto flex justify-end gap-4">
        <Button variant="outline" onClick={handleSave}>
          Save Appointment
        </Button>
        <Button
          className="bg-black text-white"
          onClick={handleProceed}
        >
          Checkout
        </Button>
      </div>
    </div>
  );
};
