
// First line replaces the existing first lines
// This component now takes locationId as a prop
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ServiceSelector } from "./ServiceSelector";
import { CheckoutSection } from "./CheckoutSection";
import { SummaryView } from "./SummaryView";
import { useAppointmentState } from "../hooks/useAppointmentState";
import { useActiveServices } from "../hooks/useActiveServices";
import { useActivePackages } from "../hooks/useActivePackages";
import useSaveAppointment from "../hooks/useSaveAppointment";
import { toast } from "sonner";
import { getTotalPrice, getTotalDuration } from "../utils/bookingUtils";
import { Appointment, SCREEN, Service, Package } from "../types";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";

interface AppointmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
  employees: any[];
  existingAppointment?: Appointment | null;
  locationId?: string;
}

// Define the expected prop types for ServiceSelector to match usage
interface ServiceSelectorProps {
  onServiceSelect: (serviceId: string) => void;
  onPackageSelect: (packageId: string) => void;
  onStylistSelect: (itemId: string, stylistId: string) => void;
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  stylists: any[];
  onCustomPackage: (packageId: string, serviceId: string) => void;
  customizedServices: Record<string, string[]>;
  locationId?: string; // Make locationId optional
}

// Define the expected prop types for CheckoutSection to match usage
interface CheckoutSectionProps {
  appointmentId: string | null;
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: any[];
  packages: any[];
  discountType: string;
  discountValue: number;
  paymentMethod: string;
  notes: string;
  onDiscountTypeChange: (value: string) => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onPaymentComplete: (appointmentId?: string) => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onSaveAppointment: () => Promise<string | undefined>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  onBackToServices: () => void;
  customizedServices: Record<string, string[]>;
  isExistingAppointment: boolean;
  locationId?: string; // Add locationId property
}

export const AppointmentManager: React.FC<AppointmentManagerProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  employees,
  existingAppointment,
  locationId
}) => {
  const [currentScreen, setCurrentScreen] = useState(
    SCREEN.SERVICE_SELECTION
  );
  const [newAppointmentId, setNewAppointmentId] = useState<string | null>(null);

  const { data: services } = useActiveServices(locationId);
  const { data: packages } = useActivePackages(locationId);

  const {
    selectedCustomer,
    setSelectedCustomer,
    setShowCreateForm,
    selectedServices,
    setSelectedServices,
    selectedPackages,
    setSelectedPackages,
    selectedStylists,
    setSelectedStylists,
    selectedDate: stateSelectedDate,
    setSelectedDate,
    selectedTime: stateSelectedTime,
    setSelectedTime,
    paymentMethod,
    setPaymentMethod,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    appointmentNotes,
    setAppointmentNotes,
    resetState,
    customizedServices,
    setCustomizedServices,
  } = useAppointmentState();

  useEffect(() => {
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
    
    if (selectedTime) {
      setSelectedTime(selectedTime);
    }

    if (existingAppointment) {
      processExistingAppointment(existingAppointment);
      setCurrentScreen(SCREEN.CHECKOUT);
    }
  }, [selectedDate, selectedTime, existingAppointment]);

  const processExistingAppointment = (appointment: Appointment) => {
    const services: string[] = [];
    const packages: string[] = [];
    const stylists: Record<string, string> = {};
    const customizedServicesMap: Record<string, string[]> = {};

    const packageIdsSet = new Set<string>();
    appointment.bookings.forEach(booking => {
      if (booking.package_id) {
        packageIdsSet.add(booking.package_id);
        if (booking.employee_id) {
          stylists[booking.package_id] = booking.employee_id;
        }
      }
    });

    const packageIds = Array.from(packageIdsSet);
    packageIds.forEach(pkgId => {
      packages.push(pkgId);
    });

    appointment.bookings.forEach(booking => {
      if (booking.service_id) {
        if (booking.package_id) {
          const basePackage = packageIds.includes(booking.package_id);
          if (basePackage) {
            const pkgDetails = appointment.bookings.find(b => 
              b.package && b.package.id === booking.package_id
            )?.package;

            if (pkgDetails) {
              const isBaseService = pkgDetails?.package_services?.some(
                ps => ps.service.id === booking.service_id
              );

              if (!isBaseService) {
                if (!customizedServicesMap[booking.package_id]) {
                  customizedServicesMap[booking.package_id] = [];
                }
                customizedServicesMap[booking.package_id].push(booking.service_id);
              }
            }
          }

          if (booking.employee_id) {
            stylists[booking.service_id] = booking.employee_id;
          }
        } else {
          services.push(booking.service_id);
          if (booking.employee_id) {
            stylists[booking.service_id] = booking.employee_id;
          }
        }
      }
    });

    setNewAppointmentId(appointment.id);
    setSelectedServices(services);
    setSelectedPackages(packages);
    setSelectedStylists(stylists);
    setCustomizedServices(customizedServicesMap);
    setPaymentMethod(appointment.payment_method as 'cash' | 'online' || 'cash');
    setDiscountType(appointment.discount_type as 'none' | 'percentage' | 'fixed' || 'none');
    setDiscountValue(appointment.discount_value || 0);
    setAppointmentNotes(appointment.notes || '');
    setSelectedCustomer(appointment.customer || null);
    
    const startDate = new Date(appointment.start_time);
    setSelectedDate(startDate);
    setSelectedTime(format(startDate, 'HH:mm'));
  };

  const calculateTotalDuration = (
    services: any[],
    packages: any[]
  ): number => {
    return getTotalDuration(
      selectedServices,
      selectedPackages,
      services,
      packages,
      customizedServices
    );
  };

  const calculateTotalPrice = (
    services: any[],
    packages: any[],
    discountType: string,
    discountValue: number
  ): number => {
    return getTotalPrice(
      selectedServices,
      selectedPackages,
      services,
      packages,
      customizedServices
    );
  };

  const { handleSaveAppointment } = useSaveAppointment({
    selectedDate: stateSelectedDate,
    selectedTime: stateSelectedTime,
    selectedCustomer,
    selectedServices,
    selectedPackages,
    services,
    packages,
    selectedStylists,
    getTotalDuration: calculateTotalDuration,
    getTotalPrice: calculateTotalPrice,
    discountType,
    discountValue,
    paymentMethod,
    notes: appointmentNotes,
    customizedServices,
    currentScreen,
    locationId
  });

  const handleProceedToCheckout = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return;
    }
    setCurrentScreen(SCREEN.CHECKOUT);
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };
  
  const handleCustomServiceToggle = (packageId: string, serviceId: string) => {
    const pkg = packages?.find((p) => p.id === packageId);
    if (!pkg) return;
    setCustomizedServices((prev) => {
      const currentServices = prev[packageId] || [];
      const newServices = currentServices.includes(serviceId)
        ? currentServices.filter((id) => id !== serviceId)
        : [...currentServices, serviceId];
      return {
        ...prev,
        [packageId]: newServices,
      };
    });
  };
  
  const handlePackageSelect = (packageId: string) => {
    setSelectedPackages((prev) =>
      prev.includes(packageId)
        ? prev.filter((id) => id !== packageId)
        : [...prev, packageId]
    );
  };

  const handleStylistSelect = (itemId: string, stylistId: string) => {
    setSelectedStylists((prev) => ({
      ...prev,
      [itemId]: stylistId,
    }));
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(id => id !== serviceId));
    const updatedStylists = { ...selectedStylists };
    delete updatedStylists[serviceId];
    setSelectedStylists(updatedStylists);
  };

  const handleRemovePackage = (packageId: string) => {
    setSelectedPackages(prev => prev.filter(id => id !== packageId));
    const updatedStylists = { ...selectedStylists };
    delete updatedStylists[packageId];
    setSelectedStylists(updatedStylists);
  };

  const handleBackToServices = () => {
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
  };

  const handlePaymentComplete = (appointmentId?: string) => {  
    setNewAppointmentId(appointmentId || null);
    setCurrentScreen(SCREEN.SUMMARY);
    resetState();
  };

  const onHandleSaveAppointment = async() => {
    const appointmentId = await handleSaveAppointment();
    if(appointmentId){
      onClose();
      resetState();
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {existingAppointment ? "Edit Appointment" : "New Appointment"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          {stateSelectedDate && (
            <p className="text-sm text-muted-foreground mt-1">
              {format(stateSelectedDate, "MMMM d, yyyy")} at {stateSelectedTime}
            </p>
          )}
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-[30%] border-r">
            <SelectCustomer
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              setShowCreateForm={setShowCreateForm}
            />
          </div>

          <div className="w-[70%] flex flex-col h-full">
            {currentScreen === SCREEN.SERVICE_SELECTION && (
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
                    locationId={locationId}
                  />
                </div>

                <div className="p-6 border-t mt-auto flex justify-end gap-4">
                  <Button variant="outline" onClick={onHandleSaveAppointment}>
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
            )}

            {currentScreen === SCREEN.CHECKOUT && (
              <CheckoutSection
                appointmentId={newAppointmentId || ""}
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
                selectedTimeSlots={{ [newAppointmentId || '']: stateSelectedTime }}
                onSaveAppointment={handleSaveAppointment}
                onRemoveService={handleRemoveService}
                onRemovePackage={handleRemovePackage}
                onBackToServices={handleBackToServices}
                customizedServices={customizedServices}
                isExistingAppointment={!!existingAppointment}
                locationId={locationId}
              />
            )}

            {currentScreen === SCREEN.SUMMARY && newAppointmentId && (
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-6">
                  Appointment Summary
                </h3>
                <SummaryView
                  appointmentId={newAppointmentId}
                />
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => {
                      setCurrentScreen(SCREEN.SERVICE_SELECTION);
                      setNewAppointmentId(null);
                    }}
                  >
                    Create New Appointment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
