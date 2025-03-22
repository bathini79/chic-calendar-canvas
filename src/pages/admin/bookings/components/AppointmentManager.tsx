
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ServiceSelector } from "./ServiceSelector";
import { CheckoutSection } from "./CheckoutSection";
import { SummaryView } from "./SummaryView";
import { SCREEN, Appointment, Customer } from "../types";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import useSaveAppointment from "../hooks/useSaveAppointment";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveServices } from "../hooks/useActiveServices";
import { useActivePackages } from "../hooks/useActivePackages";
import { getFinalPrice, getTotalDuration, getTotalPrice, getMembershipDiscount } from "../utils/bookingUtils";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { Badge } from "@/components/ui/badge";

interface AppointmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
  employees: any[];
  existingAppointment?: Appointment | null;
  locationId?: string;
}

const AppointmentManager: React.FC<AppointmentManagerProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  employees,
  existingAppointment,
  locationId,
}) => {
  const [currentScreen, setCurrentScreen] = useState(SCREEN.SERVICE_SELECTION);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    existingAppointment?.customer || null
  );
  
  // New state for customer memberships
  const { customerMemberships, fetchCustomerMemberships, getApplicableMembershipDiscount } = useCustomerMemberships();
  
  const [selectedServices, setSelectedServices] = useState<string[]>(
    existingAppointment?.bookings
      .filter((booking) => booking.service_id && !booking.package_id)
      .map((booking) => booking.service_id as string) || []
  );

  const [selectedPackages, setSelectedPackages] = useState<string[]>(
    existingAppointment?.bookings
      .filter((booking) => booking.package_id)
      .map((booking) => booking.package_id as string)
      .filter((id, index, self) => self.indexOf(id) === index) || []
  );

  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>(
    existingAppointment?.bookings.reduce((acc, booking) => {
      if (booking.service_id && booking.employee_id) {
        acc[booking.service_id] = booking.employee_id;
      }
      if (booking.package_id && booking.employee_id) {
        acc[booking.package_id] = booking.employee_id;
      }
      return acc;
    }, {} as Record<string, string>) || {}
  );

  const [timeSlots, setTimeSlots] = useState<Record<string, string>>(
    { appointment: selectedTime }
  );

  const [customizedServices, setCustomizedServices] = useState<Record<string, string[]>>(
    existingAppointment?.bookings.reduce((acc, booking) => {
      if (booking.package_id && booking.service_id) {
        if (!acc[booking.package_id]) {
          acc[booking.package_id] = [];
        }
        if (!existingAppointment.bookings.some(b => 
            b.package_id === booking.package_id && 
            b.service_id === booking.service_id && 
            b.price_paid === 0)) {
          acc[booking.package_id].push(booking.service_id);
        }
      }
      return acc;
    }, {} as Record<string, string[]>) || {}
  );

  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>(
    existingAppointment?.discount_type as 'none' | 'percentage' | 'fixed' || 'none'
  );

  const [discountValue, setDiscountValue] = useState(
    existingAppointment?.discount_value || 0
  );

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>(
    (existingAppointment?.payment_method as 'cash' | 'online') || 'cash'
  );

  const [notes, setNotes] = useState(existingAppointment?.notes || '');
  const [appointmentCreated, setAppointmentCreated] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | undefined>(
    existingAppointment?.id
  );

  // Fetch active services and packages
  const { data: services, isLoading: isServicesLoading } = useActiveServices();
  const { data: packages, isLoading: isPackagesLoading } = useActivePackages();

  // Hook for saving appointments
  const { handleSaveAppointment, isLoading: isSaving } = useSaveAppointment({
    selectedDate,
    selectedTime: timeSlots.appointment || selectedTime,
    selectedCustomer,
    selectedServices,
    selectedPackages,
    services,
    packages,
    selectedStylists,
    getTotalDuration,
    getTotalPrice,
    discountType,
    discountValue,
    paymentMethod,
    notes,
    customizedServices,
    currentScreen,
    locationId
  });

  // Effect to fetch customer memberships when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerMemberships(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  // Calculate totals based on selections
  const total = getTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices);
  const totalWithDiscount = getFinalPrice(total, discountType, discountValue);
  const duration = getTotalDuration(selectedServices, selectedPackages, services, packages, customizedServices);

  const handleAddService = (serviceId: string) => {
    if (!selectedServices.includes(serviceId)) {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter((id) => id !== serviceId));
  };

  const handleAddPackage = (packageId: string) => {
    if (!selectedPackages.includes(packageId)) {
      setSelectedPackages([...selectedPackages, packageId]);
    }
  };

  const handleRemovePackage = (packageId: string) => {
    setSelectedPackages(selectedPackages.filter((id) => id !== packageId));
    setCustomizedServices((prev) => {
      const updated = { ...prev };
      delete updated[packageId];
      return updated;
    });
  };

  const handleStylistSelect = (serviceId: string, stylistId: string) => {
    setSelectedStylists({
      ...selectedStylists,
      [serviceId]: stylistId,
    });
  };

  const handleCustomizedServicesChange = (packageId: string, serviceIds: string[]) => {
    setCustomizedServices({
      ...customizedServices,
      [packageId]: serviceIds,
    });
  };

  const handleTimeChange = (id: string, time: string) => {
    setTimeSlots({
      ...timeSlots,
      [id]: time,
    });
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleProceedToCheckout = () => {
    // Apply best membership discount if available and no manual discount is set
    if (customerMemberships.length > 0 && discountType === 'none') {
      // Check if any services or packages are eligible for membership discount
      let bestDiscountInfo = null;
      let highestDiscount = 0;
      
      // Check individual services
      for (const serviceId of selectedServices) {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          const discountInfo = getApplicableMembershipDiscount(serviceId, null, service.selling_price);
          if (discountInfo && discountInfo.calculatedDiscount > highestDiscount) {
            bestDiscountInfo = discountInfo;
            highestDiscount = discountInfo.calculatedDiscount;
          }
        }
      }
      
      // Check packages
      for (const packageId of selectedPackages) {
        const pkg = packages.find(p => p.id === packageId);
        if (pkg) {
          const packagePrice = pkg.price;
          const discountInfo = getApplicableMembershipDiscount(null, packageId, packagePrice);
          if (discountInfo && discountInfo.calculatedDiscount > highestDiscount) {
            bestDiscountInfo = discountInfo;
            highestDiscount = discountInfo.calculatedDiscount;
          }
        }
      }
      
      // Apply the best discount if found
      if (bestDiscountInfo) {
        setDiscountType(bestDiscountInfo.discountType);
        setDiscountValue(bestDiscountInfo.discountValue);
      }
    }
    
    setCurrentScreen(SCREEN.CHECKOUT);
  };

  const handleBackToServices = () => {
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
  };

  const handlePaymentComplete = async (appointmentId?: string) => {
    setCreatedAppointmentId(appointmentId);
    setAppointmentCreated(true);
    setCurrentScreen(SCREEN.SUMMARY);
  };

  const handleSaveAppointmentAndProceed = async () => {
    try {
      const id = await handleSaveAppointment();
      if (id) {
        setCreatedAppointmentId(id);
        handleProceedToCheckout();
      }
    } catch (error) {
      console.error("Error saving appointment:", error);
    }
  };

  const handleClose = () => {
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
    setShowCreateForm(false);
    setSelectedCustomer(null);
    setSelectedServices([]);
    setSelectedPackages([]);
    setSelectedStylists({});
    setTimeSlots({ appointment: selectedTime });
    setCustomizedServices({});
    setDiscountType('none');
    setDiscountValue(0);
    setPaymentMethod('cash');
    setNotes('');
    setAppointmentCreated(false);
    setCreatedAppointmentId(undefined);
    onClose();
  };

  const handleAddAnother = () => {
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
    setSelectedServices([]);
    setSelectedPackages([]);
    setSelectedStylists({});
    setTimeSlots({ appointment: selectedTime });
    setCustomizedServices({});
    setDiscountType('none');
    setDiscountValue(0);
    setPaymentMethod('cash');
    setNotes('');
    setAppointmentCreated(false);
    setCreatedAppointmentId(undefined);
  };

  if (appointmentCreated && currentScreen === SCREEN.SUMMARY) {
    return (
      <SummaryView
        isOpen={isOpen}
        onClose={handleClose}
        customer={selectedCustomer}
        totalPrice={totalWithDiscount}
        items={[
          ...selectedServices.map((id) => {
            const service = services.find((s) => s.id === id);
            return {
              id,
              name: service?.name || "",
              price: service?.selling_price || 0,
              type: "service",
            };
          }),
          ...selectedPackages.map((id) => {
            const pkg = packages.find((p) => p.id === id);
            return {
              id,
              name: pkg?.name || "",
              price: pkg?.price || 0,
              type: "package",
            };
          }),
        ]}
        paymentMethod={paymentMethod}
        onAddAnother={handleAddAnother}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-white w-full max-w-screen-2xl h-screen max-h-screen flex flex-col rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-2xl font-semibold">
            {existingAppointment ? "Edit Appointment" : "New Appointment"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/4 border-r overflow-y-auto p-4">
            <SelectCustomer
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={handleCustomerSelect}
              setShowCreateForm={setShowCreateForm}
            />
            
            {/* Display active memberships if any */}
            {selectedCustomer && customerMemberships.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Active Memberships</h3>
                <div className="space-y-2">
                  {customerMemberships.map(membership => (
                    <div key={membership.id} className="text-xs bg-white p-2 rounded border border-blue-100">
                      <div className="font-medium">{membership.membership?.name}</div>
                      <div className="text-muted-foreground mt-1">
                        Expires: {new Date(membership.end_date).toLocaleDateString()}
                      </div>
                      <Badge variant="outline" className="mt-1 bg-blue-50">
                        {membership.membership?.discount_type === 'percentage' 
                          ? `${membership.membership?.discount_value}% off` 
                          : `₹${membership.membership?.discount_value} off`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 flex">
            {currentScreen === SCREEN.SERVICE_SELECTION ? (
              <div className="flex-1 flex flex-col">
                <ServiceSelector
                  onAddService={handleAddService}
                  onAddPackage={handleAddPackage}
                  onRemoveService={handleRemoveService}
                  onRemovePackage={handleRemovePackage}
                  selectedDate={selectedDate}
                  selectedTime={timeSlots.appointment || selectedTime}
                  selectedServices={selectedServices}
                  selectedPackages={selectedPackages}
                  selectedStylists={selectedStylists}
                  timeSlots={timeSlots}
                  employees={employees}
                  onStylistSelect={handleStylistSelect}
                  onTimeChange={handleTimeChange}
                  services={services}
                  packages={packages}
                  isLoading={isServicesLoading || isPackagesLoading}
                  customizedServices={customizedServices}
                  onCustomizedServicesChange={handleCustomizedServicesChange}
                  locationId={locationId}
                />

                <div className="p-4 border-t mt-auto">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        {selectedServices.length + selectedPackages.length}{" "}
                        {(selectedServices.length + selectedPackages.length) === 1
                          ? "item"
                          : "items"}{" "}
                        selected
                      </p>
                      <p className="text-lg font-semibold">
                        Total: ₹{total} • Duration: {Math.floor(duration / 60)}h{" "}
                        {duration % 60}m
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={
                          !selectedCustomer ||
                          (selectedServices.length === 0 && selectedPackages.length === 0)
                        }
                        onClick={handleSaveAppointmentAndProceed}
                      >
                        Save for Later
                      </Button>
                      <Button
                        disabled={
                          !selectedCustomer ||
                          (selectedServices.length === 0 && selectedPackages.length === 0)
                        }
                        onClick={handleProceedToCheckout}
                      >
                        Continue to Checkout
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <CheckoutSection
                appointmentId={createdAppointmentId}
                selectedCustomer={selectedCustomer}
                selectedServices={selectedServices}
                selectedPackages={selectedPackages}
                services={services}
                packages={packages}
                discountType={discountType}
                discountValue={discountValue}
                paymentMethod={paymentMethod}
                notes={notes}
                onDiscountTypeChange={setDiscountType}
                onDiscountValueChange={setDiscountValue}
                onPaymentMethodChange={setPaymentMethod}
                onNotesChange={setNotes}
                onPaymentComplete={handlePaymentComplete}
                selectedStylists={selectedStylists}
                selectedTimeSlots={timeSlots}
                onSaveAppointment={handleSaveAppointment}
                onRemoveService={handleRemoveService}
                onRemovePackage={handleRemovePackage}
                onBackToServices={handleBackToServices}
                isExistingAppointment={!!existingAppointment}
                customizedServices={customizedServices}
                locationId={locationId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { AppointmentManager };
