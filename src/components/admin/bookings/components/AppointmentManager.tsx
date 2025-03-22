
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ServiceSelector } from "@/pages/admin/bookings/components/ServiceSelector";
import { CheckoutSection } from "@/pages/admin/bookings/components/CheckoutSection";
import { SummaryView } from "@/pages/admin/bookings/components/SummaryView";
import { useAppointmentState } from "@/pages/admin/bookings/hooks/useAppointmentState";
import { useActiveServices } from "@/pages/admin/bookings/hooks/useActiveServices";
import { useActivePackages } from "@/pages/admin/bookings/hooks/useActivePackages";
import useSaveAppointment from "@/pages/admin/bookings/hooks/useSaveAppointment";
import { toast } from "sonner";
import { getTotalPrice, getTotalDuration } from "@/pages/admin/bookings/utils/bookingUtils";
import { Appointment, SCREEN, Service, Package } from "@/pages/admin/bookings/types";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { Badge } from "@/components/ui/badge";
import { Bookmark, CheckCircle2, AlertCircle, Tag } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface AppointmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
  employees: any[];
  existingAppointment?: Appointment | null;
  locationId?: string;
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

  // Get active memberships for the selected customer
  const { activeMembership, isLoading: membershipLoading } = useCustomerMemberships(selectedCustomer?.id);
  
  // State to track if membership discount should be applied
  const [applyMembershipDiscount, setApplyMembershipDiscount] = useState(true);
  
  // Calculate applicable services and packages based on membership
  const [applicableServices, setApplicableServices] = useState<string[]>([]);
  const [applicablePackages, setApplicablePackages] = useState<string[]>([]);
  
  // Track membership discount details for display
  const [membershipDiscountInfo, setMembershipDiscountInfo] = useState({
    type: '',
    value: 0,
    applicableItems: 0
  });

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
  
  // Process active membership
  useEffect(() => {
    if (activeMembership && activeMembership.membership) {
      const membership = activeMembership.membership;
      setApplicableServices(membership.applicable_services || []);
      setApplicablePackages(membership.applicable_packages || []);
      
      // If membership is "apply to all" or has specific services/packages
      const hasSpecificItems = 
        (membership.applicable_services && membership.applicable_services.length > 0) ||
        (membership.applicable_packages && membership.applicable_packages.length > 0);
        
      setMembershipDiscountInfo({
        type: membership.discount_type,
        value: membership.discount_value,
        applicableItems: hasSpecificItems ? 
          (membership.applicable_services?.length || 0) + (membership.applicable_packages?.length || 0) :
          0
      });
      
      // Auto-apply membership discount if applicable
      if (applyMembershipDiscount) {
        setDiscountType(membership.discount_type);
        setDiscountValue(membership.discount_value);
      }
    } else {
      // Reset discount if no membership and the discount was from membership
      if (applyMembershipDiscount) {
        setDiscountType('none');
        setDiscountValue(0);
      }
      setApplicableServices([]);
      setApplicablePackages([]);
      setMembershipDiscountInfo({
        type: '',
        value: 0,
        applicableItems: 0
      });
    }
  }, [activeMembership, applyMembershipDiscount]);

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
    setPaymentMethod(appointment.payment_method || 'cash');
    setDiscountType(appointment.discount_type || 'none');
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
    // Check if membership discount should be applied
    if (activeMembership && activeMembership.membership && applyMembershipDiscount) {
      const membership = activeMembership.membership;
      const membershipDiscountType = membership.discount_type;
      const membershipDiscountValue = membership.discount_value;
      
      // Override with membership discount
      return getTotalPrice(
        selectedServices,
        selectedPackages,
        services,
        packages,
        customizedServices,
        membershipDiscountType,
        membershipDiscountValue,
        membership.applicable_services,
        membership.applicable_packages
      );
    }
    
    // Regular discount calculation
    return getTotalPrice(
      selectedServices,
      selectedPackages,
      services,
      packages,
      customizedServices,
      discountType,
      discountValue
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
    discountType: activeMembership && applyMembershipDiscount ? activeMembership.membership?.discount_type || discountType : discountType,
    discountValue: activeMembership && applyMembershipDiscount ? activeMembership.membership?.discount_value || discountValue : discountValue,
    paymentMethod,
    notes: appointmentNotes,
    customizedServices,
    currentScreen,
    locationId,
    membershipId: activeMembership && applyMembershipDiscount ? activeMembership.membership_id : undefined
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

  // Calculate if any selected services/packages are eligible for membership discount
  const hasEligibleItems = () => {
    if (!activeMembership || !activeMembership.membership) return false;
    
    const membership = activeMembership.membership;
    
    // If membership applies to all items
    if (membership.applicable_services.length === 0 && membership.applicable_packages.length === 0) {
      return selectedServices.length > 0 || selectedPackages.length > 0;
    }
    
    // Check if any selected service is eligible
    const hasEligibleService = selectedServices.some(serviceId => 
      membership.applicable_services.includes(serviceId)
    );
    
    // Check if any selected package is eligible
    const hasEligiblePackage = selectedPackages.some(packageId => 
      membership.applicable_packages.includes(packageId)
    );
    
    return hasEligibleService || hasEligiblePackage;
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
          <div className="w-[30%] border-r flex flex-col">
            <SelectCustomer
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              setShowCreateForm={setShowCreateForm}
            />
            
            {/* Membership information */}
            {selectedCustomer && (
              <div className="p-4 border-t">
                {membershipLoading ? (
                  <div className="text-center text-sm text-muted-foreground">
                    Loading membership info...
                  </div>
                ) : activeMembership ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4 text-primary" />
                      <span className="font-medium">Active Membership</span>
                      <Badge 
                        variant="outline" 
                        className="ml-auto border-green-500 text-green-600 text-xs"
                      >
                        ACTIVE
                      </Badge>
                    </div>
                    <div className="bg-primary/5 rounded-md p-3 text-sm space-y-2">
                      <div className="font-medium">{activeMembership.membership?.name}</div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Valid until:</span>
                        <span className="font-medium">
                          {format(new Date(activeMembership.end_date), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Discount:</span>
                        <Badge variant="secondary" className="font-medium">
                          {activeMembership.membership?.discount_type === 'percentage' 
                            ? `${activeMembership.membership?.discount_value}% off` 
                            : formatPrice(activeMembership.membership?.discount_value || 0)}
                        </Badge>
                      </div>
                      
                      {/* Membership discount toggle */}
                      <div className="flex items-center justify-between pt-1 mt-1 border-t border-primary/10">
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="checkbox"
                            checked={applyMembershipDiscount}
                            onChange={(e) => setApplyMembershipDiscount(e.target.checked)}
                            id="apply-membership"
                            className="rounded border-gray-300 text-primary focus:ring-primary/20"
                          />
                          <label htmlFor="apply-membership" className="text-xs font-medium">
                            Apply membership discount
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Information about membership coverage */}
                    {hasEligibleItems() ? (
                      <Alert variant="default" className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800 text-xs font-medium">
                          Membership discount will be applied
                        </AlertTitle>
                        <AlertDescription className="text-green-700 text-xs">
                          {membershipDiscountInfo.applicableItems === 0 
                            ? "This membership applies to all services and packages." 
                            : `This membership applies to ${membershipDiscountInfo.applicableItems} specific items.`}
                        </AlertDescription>
                      </Alert>
                    ) : selectedServices.length > 0 || selectedPackages.length > 0 ? (
                      <Alert variant="default" className="bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 text-xs font-medium">
                          No eligible items selected
                        </AlertTitle>
                        <AlertDescription className="text-amber-700 text-xs">
                          The selected services/packages are not eligible for the membership discount.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground flex flex-col items-center gap-2 py-2">
                    <Bookmark className="h-5 w-5 text-muted-foreground/70" />
                    <p className="text-center">No active membership</p>
                  </div>
                )}
              </div>
            )}
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
                    membershipEligibleServices={activeMembership?.membership?.applicable_services || []}
                    membershipEligiblePackages={activeMembership?.membership?.applicable_packages || []}
                    hasMembershipBenefits={!!activeMembership}
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
                discountType={activeMembership && applyMembershipDiscount ? activeMembership.membership?.discount_type || discountType : discountType}
                discountValue={activeMembership && applyMembershipDiscount ? activeMembership.membership?.discount_value || discountValue : discountValue}
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
                membershipId={activeMembership && applyMembershipDiscount ? activeMembership.membership_id : undefined}
                hasMembershipDiscount={activeMembership !== null && applyMembershipDiscount}
                membershipEligibleServices={activeMembership?.membership?.applicable_services || []}
                membershipEligiblePackages={activeMembership?.membership?.applicable_packages || []}
              />
            )}

            {currentScreen === SCREEN.SUMMARY && newAppointmentId && (
              <div className="p-6">
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
