
import React, { createContext, useContext, ReactNode, useState } from "react";
import { Customer, Service, Package, DiscountType, SCREEN } from "../types";
import { useAppointmentState } from "../hooks/useAppointmentState";
import useSaveAppointment from "../hooks/useSaveAppointment";
import { getTotalPrice, getTotalDuration } from "../utils/bookingUtils";

type ScreenType = (typeof SCREEN)[keyof typeof SCREEN];

interface BookingContextType {
  // State
  currentScreen: ScreenType;
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  selectedDate: Date | null;
  selectedTime: string | null;
  paymentMethod: "cash" | "online";
  discountType: DiscountType | string;
  discountValue: number;
  appointmentNotes: string;
  customizedServices: Record<string, string[]>;
  newAppointmentId: string | null;
  
  // Functions
  setCurrentScreen: (screen: ScreenType) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setShowCreateForm: (show: boolean) => void;
  setSelectedServices: (services: string[]) => void;
  setSelectedPackages: (packages: string[]) => void;
  setSelectedStylists: (stylists: Record<string, string>) => void;
  setSelectedDate: (date: Date | null) => void;
  setSelectedTime: (time: string | null) => void;
  setPaymentMethod: (method: "cash" | "online") => void;
  setDiscountType: (type: DiscountType | string) => void;
  setDiscountValue: (value: number) => void;
  setAppointmentNotes: (notes: string) => void;
  setCustomizedServices: (services: Record<string, string[]>) => void;
  setNewAppointmentId: (id: string | null) => void;
  resetState: () => void;
  
  // Action handlers
  handleServiceSelect: (serviceId: string) => void;
  handlePackageSelect: (packageId: string) => void;
  handleStylistSelect: (itemId: string, stylistId: string) => void;
  handleCustomServiceToggle: (packageId: string, serviceId: string) => void;
  handleRemoveService: (serviceId: string) => void;
  handleRemovePackage: (packageId: string) => void;
  handleProceedToCheckout: () => void;
  handleBackToServices: () => void;
  handlePaymentComplete: (appointmentId?: string) => void;
  handleSaveAppointment: () => Promise<string | null>;
  
  // Additional data
  services: Service[] | undefined;
  packages: Package[] | undefined;
}

export const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
};

interface BookingProviderProps {
  children: ReactNode;
  services: Service[] | undefined;
  packages: Package[] | undefined;
  onClose?: () => void;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({
  children,
  services,
  packages,
  onClose,
}) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(SCREEN.SERVICE_SELECTION);
  const [newAppointmentId, setNewAppointmentId] = useState<string | null>(null);
  
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
    selectedDate,
    setSelectedDate,
    selectedTime,
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

  const { handleSaveAppointment } = useSaveAppointment({
    selectedDate,
    selectedTime,
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
    notes: appointmentNotes,
    customizedServices,
    currentScreen
  });

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
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

  const handleProceedToCheckout = async () => {
    if (!selectedCustomer) {
      return;
    }
    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      return;
    }
    setCurrentScreen(SCREEN.CHECKOUT);
  };

  const handleBackToServices = () => {
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
  };

  const handlePaymentComplete = (appointmentId?: string) => {  
    setNewAppointmentId(appointmentId || null);
    setCurrentScreen(SCREEN.SUMMARY);
    resetState();
  };

  const value = {
    // State
    currentScreen,
    selectedCustomer,
    selectedServices,
    selectedPackages,
    selectedStylists,
    selectedDate,
    selectedTime,
    paymentMethod,
    discountType,
    discountValue,
    appointmentNotes,
    customizedServices,
    newAppointmentId,
    
    // State setters
    setCurrentScreen,
    setSelectedCustomer,
    setShowCreateForm,
    setSelectedServices,
    setSelectedPackages,
    setSelectedStylists,
    setSelectedDate,
    setSelectedTime,
    setPaymentMethod,
    setDiscountType,
    setDiscountValue,
    setAppointmentNotes,
    setCustomizedServices,
    setNewAppointmentId,
    resetState,
    
    // Action handlers
    handleServiceSelect,
    handlePackageSelect,
    handleStylistSelect,
    handleCustomServiceToggle,
    handleRemoveService,
    handleRemovePackage,
    handleProceedToCheckout,
    handleBackToServices,
    handlePaymentComplete,
    handleSaveAppointment,
    
    // Additional data
    services,
    packages,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};
