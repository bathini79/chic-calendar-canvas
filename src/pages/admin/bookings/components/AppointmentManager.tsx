
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
import { Appointment, SCREEN, Service, Package, PaymentMethod, AppointmentStatus } from "../types";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { formatTime, formatTimeString } from "../utils/timeUtils";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import { useAppointmentDetails } from "../hooks/useAppointmentDetails";
import { StatusBadge, getStatusBackgroundColor } from "./StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AppointmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
  employees: any[];
  existingAppointment?: Appointment | null;
  locationId?: string;
  onAppointmentSaved?: () => void;
}

export const AppointmentManager: React.FC<AppointmentManagerProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  employees,
  existingAppointment,
  locationId,
  onAppointmentSaved,
}) => {
  const [currentScreen, setCurrentScreen] = useState(SCREEN.SERVICE_SELECTION);
  const [newAppointmentId, setNewAppointmentId] = useState<string | null>(null);
  const [appointmentStatus, setAppointmentStatus] = useState<AppointmentStatus>("pending");
  const [showStatusConfirmation, setShowStatusConfirmation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(null);
  
  const { appointment, refetch: refetchAppointment } = useAppointmentDetails(
    existingAppointment?.id
  );
  
  const { cancelAppointment, markAppointmentAs, updateAppointmentStatus } = useAppointmentActions();

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
    appliedTaxId,
    taxAmount,
  } = useAppointmentState();

  useEffect(() => {
    if (appointment) {
      setAppointmentStatus(appointment.status || "pending");
    }
  }, [appointment]);

  useEffect(() => {
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }

    if (selectedTime) {
      setSelectedTime(selectedTime);
    }

    if (existingAppointment) {
      processExistingAppointment(existingAppointment);
      setAppointmentStatus(existingAppointment.status || "pending");
      
      if (existingAppointment.status === "completed" || existingAppointment.status === "refunded" || existingAppointment.status === "partially_refunded") {
        setCurrentScreen(SCREEN.SUMMARY);
        setNewAppointmentId(existingAppointment.id);
      } else {
        setCurrentScreen(SCREEN.CHECKOUT);
      }
    }
  }, [selectedDate, selectedTime, existingAppointment]);

  const processExistingAppointment = (appointment: Appointment) => {
    const services: string[] = [];
    const packages: string[] = [];
    const stylists: Record<string, string> = {};
    const customizedServicesMap: Record<string, string[]> = {};

    const packageIdsSet = new Set<string>();
    appointment.bookings.forEach((booking) => {
      if (booking.package_id) {
        packageIdsSet.add(booking.package_id);
        if (booking.employee_id) {
          stylists[booking.package_id] = booking.employee_id;
        }
      }
    });

    const packageIds = Array.from(packageIdsSet);
    packageIds.forEach((pkgId) => {
      packages.push(pkgId);
    });

    appointment.bookings.forEach((booking) => {
      if (booking.service_id) {
        if (booking.package_id) {
          const basePackage = packageIds.includes(booking.package_id);
          if (basePackage) {
            const pkgDetails = appointment.bookings.find(
              (b) => b.package && b.package.id === booking.package_id
            )?.package;

            if (pkgDetails) {
              const isBaseService = pkgDetails?.package_services?.some(
                (ps) => ps.service.id === booking.service_id
              );

              if (!isBaseService) {
                if (!customizedServicesMap[booking.package_id]) {
                  customizedServicesMap[booking.package_id] = [];
                }
                customizedServicesMap[booking.package_id].push(
                  booking.service_id
                );
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
    setPaymentMethod(
      (appointment.payment_method as PaymentMethod) || "cash"
    );
    setDiscountType(
      (appointment.discount_type as "none" | "percentage" | "fixed") || "none"
    );
    setDiscountValue(appointment.discount_value || 0);
    setAppointmentNotes(appointment.notes || "");
    setSelectedCustomer(appointment.customer || null);

    const startDate = new Date(appointment.start_time);
    setSelectedDate(startDate);
    setSelectedTime(format(startDate, "HH:mm"));
  };

  const calculateTotalDuration = (services: any[], packages: any[]): number => {
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
    locationId,
    appliedTaxId,
    taxAmount,
    couponId: existingAppointment?.coupon_id,
    couponDiscount: existingAppointment?.discount_value || 0,
    status: appointmentStatus,
    membership_discount: existingAppointment?.membership_discount || 0,
    membership_id: existingAppointment?.membership_id,
    membership_name: existingAppointment?.membership_name,
    coupon_name: existingAppointment?.coupon_name,
    coupon_amount: existingAppointment?.coupon_amount
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
    setSelectedServices((prev) => prev.filter((id) => id !== serviceId));
    const updatedStylists = { ...selectedStylists };
    delete updatedStylists[serviceId];
    setSelectedStylists(updatedStylists);
  };

  const handleRemovePackage = (packageId: string) => {
    setSelectedPackages((prev) => prev.filter((id) => id !== packageId));
    const updatedStylists = { ...selectedStylists };
    delete updatedStylists[packageId];
    setSelectedStylists(updatedStylists);
  };

  const handleBackToServices = () => {
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
  };

  const handlePaymentComplete = async (appointmentId?: string) => {
    const savedId = appointmentId || newAppointmentId;
    setNewAppointmentId(savedId);
    setCurrentScreen(SCREEN.SUMMARY);
    
    if (savedId) {
      try {
        const { data } = await supabase
          .from('bookings')
          .select('id')
          .eq('appointment_id', savedId);
          
        const bookingIds = data?.map(b => b.id) || [];
        
        await updateAppointmentStatus(savedId, "completed", bookingIds);
        
        await refetchAppointment();
        
        setAppointmentStatus("completed");
      } catch (error) {
        console.error("Error updating status after payment:", error);
      }
    }

    if (onAppointmentSaved) {
      onAppointmentSaved();
    }

    resetState();
  };

  const onHandleSaveAppointment = async () => {
    const appointmentId = await handleSaveAppointment();
    if (appointmentId) {
      if (onAppointmentSaved) {
        onAppointmentSaved();
      }
      onClose();
      resetState();
    }
  };

  const handleCancelAppointment = async () => {
    if (existingAppointment?.id) {
      try {
        await cancelAppointment(existingAppointment.id);
        toast.success("Appointment canceled successfully");
        onClose();
        if (onAppointmentSaved) {
          onAppointmentSaved();
        }
      } catch (error) {
        console.error("Error canceling appointment:", error);
        toast.error("Failed to cancel appointment");
      }
    }
  };

  const handleMarkAs = async (status: "noshow" | "completed") => {
    if (existingAppointment?.id) {
      try {
        await markAppointmentAs(existingAppointment.id, status);
        toast.success(`Appointment marked as ${status}`);
        
        setAppointmentStatus(status);
        
        if (status === "completed") {
          setCurrentScreen(SCREEN.SUMMARY);
        }
        
        if (onAppointmentSaved) {
          onAppointmentSaved();
        }
      } catch (error) {
        console.error(`Error marking appointment as ${status}:`, error);
        toast.error(`Failed to mark appointment as ${status}`);
      }
    }
  };

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (status === "noshow" || status === "canceled") {
      setPendingStatus(status);
      setShowStatusConfirmation(true);
    } else {
      setAppointmentStatus(status);
      await applyStatusChange(status);
    }
  };

  const applyStatusChange = async (status: AppointmentStatus) => {
    if (existingAppointment?.id) {
      try {
        const bookingIds = existingAppointment.bookings?.map(booking => booking.id) || [];
        
        const success = await updateAppointmentStatus(
          existingAppointment.id,
          status,
          bookingIds
        );
        
        if (success) {
          toast.success(`Appointment status updated to ${status}`);
          
          setAppointmentStatus(status);
          
          if (status === "completed") {
            setNewAppointmentId(existingAppointment.id);
            setCurrentScreen(SCREEN.SUMMARY);
          }
          
          await refetchAppointment();
        }
      } catch (error) {
        console.error("Error updating appointment status:", error);
        toast.error("Failed to update appointment status");
      }
    }
  };

  const confirmStatusChange = async () => {
    if (pendingStatus) {
      setAppointmentStatus(pendingStatus);
      await applyStatusChange(pendingStatus);
      setPendingStatus(null);
      setShowStatusConfirmation(false);
    }
  };

  const currentStatus = appointment?.status || appointmentStatus;
  const isCompleted = currentStatus === "completed";
  
  const shouldShowStatusDropdown = existingAppointment !== null && existingAppointment !== undefined;

  const displayTime = stateSelectedTime ? formatTimeString(stateSelectedTime) : "";
  
  const headerBgColor = currentStatus && getStatusBackgroundColor(currentStatus);

  return (
    <div
      className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex flex-1 min-h-0">
          <div className="w-[30%] border-r">
            <SelectCustomer
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              setShowCreateForm={setShowCreateForm}
            />
          </div>

          <div className="w-[70%] flex flex-col h-full">
            <div className={`p-6 border-b flex-shrink-0 ${headerBgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-start flex-col">
                  {stateSelectedDate && (
                    <div className="text-2xl font-bold">
                      {format(stateSelectedDate, "EEE d MMM")}
                    </div>
                  )}
                  <div className="flex items-center mt-1 gap-4">
                    <p className="text-sm text-muted-foreground">
                      {displayTime}
                    </p>
                    
                    {shouldShowStatusDropdown && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={currentStatus}
                          onValueChange={(value) => handleStatusChange(value as AppointmentStatus)}
                          disabled={isCompleted}
                        >
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue>
                              <StatusBadge status={currentStatus} />
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="booked">
                              <StatusBadge status="booked" />
                            </SelectItem>
                            <SelectItem value="confirmed">
                              <StatusBadge status="confirmed" />
                            </SelectItem>
                            <SelectItem value="inprogress">
                              <StatusBadge status="inprogress" />
                            </SelectItem>
                            <SelectItem value="noshow">
                              <StatusBadge status="noshow" />
                            </SelectItem>
                            <SelectItem value="canceled">
                              <StatusBadge status="canceled" />
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-h-0">
              {currentScreen === SCREEN.SERVICE_SELECTION && (
                <>
                  <div className="p-6 flex-shrink-0">
                    <h3 className="text-lg font-semibold">Select Services</h3>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 min-h-0">
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

                  <div className="p-6 border-t flex-shrink-0 flex justify-end gap-4 bg-white">
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
                </>
              )}

              {currentScreen === SCREEN.CHECKOUT && (
                <CheckoutSection
                  appointmentId={newAppointmentId || existingAppointment?.id || ""}
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
                  selectedTimeSlots={{
                    [newAppointmentId || existingAppointment?.id || ""]: stateSelectedTime,
                  }}
                  onSaveAppointment={handleSaveAppointment}
                  onRemoveService={handleRemoveService}
                  onRemovePackage={handleRemovePackage}
                  onBackToServices={handleBackToServices}
                  customizedServices={customizedServices}
                  isExistingAppointment={!!existingAppointment}
                  locationId={locationId}
                  onCancelAppointment={existingAppointment ? handleCancelAppointment : undefined}
                  onMarkAsNoShow={existingAppointment ? () => handleMarkAs("noshow") : undefined}
                  onMarkAsCompleted={existingAppointment ? () => handleMarkAs("completed") : undefined}
                  appointmentStatus={currentStatus}
                />
              )}

              {currentScreen === SCREEN.SUMMARY && newAppointmentId && (
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-6">
                    Appointment Summary
                  </h3>
                  <SummaryView appointmentId={newAppointmentId} />
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

      <AlertDialog open={showStatusConfirmation} onOpenChange={setShowStatusConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus === "canceled" 
                ? "Cancel Appointment" 
                : pendingStatus === "noshow" 
                  ? "Mark as No Show" 
                  : "Change Status"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === "canceled" 
                ? "Are you sure you want to cancel this appointment? This will notify the customer and free up the time slot."
                : pendingStatus === "noshow" 
                  ? "Are you sure you want to mark this appointment as a no-show? This will be recorded in the customer's history."
                  : "Are you sure you want to change the status?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              {pendingStatus === "canceled" 
                ? "Yes, Cancel Appointment" 
                : pendingStatus === "noshow" 
                  ? "Yes, Mark as No Show" 
                  : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
