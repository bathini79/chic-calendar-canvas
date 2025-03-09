import React, { createContext, useContext, useEffect } from 'react';
import { useAppointmentState } from '../hooks/useAppointmentState';
import { SCREEN, Customer, Service, Package } from '../types';
import { getTotalPrice, getTotalDuration } from '../utils/bookingUtils';
import useSaveAppointment from '../hooks/useSaveAppointment';
import { toast } from 'sonner';

interface AppointmentWorkflowContextType {
  // State from useAppointmentState
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  showCreateForm: boolean;
  setShowCreateForm: (show: boolean) => void;
  selectedServices: string[];
  setSelectedServices: (services: string[]) => void;
  selectedPackages: string[];
  setSelectedPackages: (packages: string[]) => void;
  selectedStylists: Record<string, string>;
  setSelectedStylists: (stylists: Record<string, string>) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedTime: string | undefined;
  setSelectedTime: (time: string | undefined) => void;
  notes: string;
  setNotes: (notes: string) => void;
  paymentMethod: "cash" | "online";
  setPaymentMethod: (method: "cash" | "online") => void;
  discountType: "none" | "percentage" | "fixed";
  setDiscountType: (type: "none" | "percentage" | "fixed") => void;
  discountValue: number;
  setDiscountValue: (value: number) => void;
  appointmentNotes: string;
  setAppointmentNotes: (notes: string) => void;
  customizedServices: Record<string, string[]>;
  setCustomizedServices: (services: Record<string, string[]>) => void;
  resetState: () => void;

  // Additional workflow state
  currentScreen: (typeof SCREEN)[keyof typeof SCREEN];
  setCurrentScreen: (screen: (typeof SCREEN)[keyof typeof SCREEN]) => void;
  newAppointmentId: string | null;
  setNewAppointmentId: (id: string | null) => void;
  isAddAppointmentOpen: boolean;
  setIsAddAppointmentOpen: (open: boolean) => void;

  // Actions
  handleServiceSelect: (serviceId: string) => void;
  handlePackageSelect: (packageId: string, serviceIds?: string[]) => void;
  handleStylistSelect: (itemId: string, stylistId: string) => void;
  handleCustomServiceToggle: (packageId: string, serviceId: string) => void;
  handleProceedToCheckout: () => void;
  handleBackToServices: () => void;
  handlePaymentComplete: (appointmentId?: string) => void;
  handleCloseAppointment: () => void;
  handleSaveAppointment: () => Promise<string | null>;
  handleRemoveService: (serviceId: string) => void;
  handleRemovePackage: (packageId: string) => void;
}

export const AppointmentWorkflowContext = createContext<AppointmentWorkflowContextType | undefined>(undefined);

export const useAppointmentWorkflow = () => {
  const context = useContext(AppointmentWorkflowContext);
  if (!context) {
    throw new Error('useAppointmentWorkflow must be used within an AppointmentWorkflowProvider');
  }
  return context;
};

interface AppointmentWorkflowProviderProps {
  children: React.ReactNode;
  services?: Service[];
  packages?: Package[];
}

export const AppointmentWorkflowProvider: React.FC<AppointmentWorkflowProviderProps> = ({ 
  children, 
  services = [],
  packages = []
}) => {
  const [currentScreen, setCurrentScreen] = React.useState<(typeof SCREEN)[keyof typeof SCREEN]>(
    SCREEN.SERVICE_SELECTION
  );
  const [newAppointmentId, setNewAppointmentId] = React.useState<string | null>(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = React.useState(false);

  const appointmentState = useAppointmentState();
  const {
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
    paymentMethod,
    setPaymentMethod,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    appointmentNotes,
    setAppointmentNotes,
    customizedServices,
    setCustomizedServices,
    resetState
  } = appointmentState;

  useEffect(() => {
    console.log("WorkflowContext - Current Screen:", currentScreen);
    console.log("WorkflowContext - Selected Services:", selectedServices);
    console.log("WorkflowContext - Selected Packages:", selectedPackages);
  }, [currentScreen, selectedServices, selectedPackages]);

  const { handleSaveAppointment: saveAppointment, isSaving } = useSaveAppointment({
    selectedDate,
    selectedTime,
    selectedCustomer,
    selectedServices,
    selectedPackages,
    services: services || [],
    packages: packages || [],
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

  const handlePackageSelect = (packageId: string, serviceIds?: string[]) => {
    setSelectedPackages((prev) => {
      if (prev.includes(packageId)) {
        return prev.filter((id) => id !== packageId);
      } else {
        return [...prev, packageId];
      }
    });
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

  const handleProceedToCheckout = () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    
    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return;
    }
    
    console.log("Proceeding to checkout");
    setCurrentScreen(SCREEN.CHECKOUT);
  };

  const handleBackToServices = () => {
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
  };

  const handlePaymentComplete = (appointmentId?: string) => {
    console.log("Payment complete, appointment ID:", appointmentId);
    setNewAppointmentId(appointmentId || null);
    setCurrentScreen(SCREEN.SUMMARY);
  };

  const handleCloseAppointment = () => {
    setIsAddAppointmentOpen(false);
    resetState();
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
    setNewAppointmentId(null);
  };

  const handleSaveAppointment = async () => {
    try {
      if (isSaving) {
        toast.info("Already saving...");
        return null;
      }
      
      const appointmentId = await saveAppointment();
      if (appointmentId) {
        toast.success("Appointment saved successfully");
        handlePaymentComplete(appointmentId);
      }
      return appointmentId;
    } catch (error) {
      console.error("Error saving appointment:", error);
      toast.error("Failed to save appointment");
      return null;
    }
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

  const value = {
    // State from useAppointmentState
    ...appointmentState,
    
    // Additional workflow state
    currentScreen,
    setCurrentScreen,
    newAppointmentId,
    setNewAppointmentId,
    isAddAppointmentOpen,
    setIsAddAppointmentOpen,

    // Actions
    handleServiceSelect,
    handlePackageSelect,
    handleStylistSelect,
    handleCustomServiceToggle,
    handleProceedToCheckout,
    handleBackToServices,
    handlePaymentComplete,
    handleCloseAppointment,
    handleSaveAppointment,
    handleRemoveService,
    handleRemovePackage
  };

  return (
    <AppointmentWorkflowContext.Provider value={value}>
      {children}
    </AppointmentWorkflowContext.Provider>
  );
};
