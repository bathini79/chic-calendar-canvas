
import React, { createContext, useContext, ReactNode } from "react";
import { Customer, Service, Package, AppointmentStatus, DiscountType } from "../types";
import { SCREEN } from "../types";

type ScreenType = (typeof SCREEN)[keyof typeof SCREEN];

interface AppointmentWorkflowContextType {
  // State
  currentScreen: ScreenType;
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  customizedServices: Record<string, string[]>;
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  paymentMethod: "cash" | "online";
  discountType: DiscountType | string;
  discountValue: number;
  appointmentNotes: string;
  newAppointmentId: string | null;
  isAddAppointmentOpen: boolean;
  
  // Functions
  setCurrentScreen: (screen: ScreenType) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setSelectedServices: (services: string[]) => void;
  setSelectedPackages: (packages: string[]) => void;
  setSelectedStylists: (stylists: Record<string, string>) => void;
  setCustomizedServices: (services: Record<string, string[]>) => void;
  setSelectedDate: (date: Date | undefined) => void;
  setSelectedTime: (time: string | undefined) => void;
  setPaymentMethod: (method: "cash" | "online") => void;
  setDiscountType: (type: DiscountType | string) => void;
  setDiscountValue: (value: number) => void;
  setAppointmentNotes: (notes: string) => void;
  setNewAppointmentId: (id: string | null) => void;
  setIsAddAppointmentOpen: (isOpen: boolean) => void;
  
  // Action handlers
  handleServiceSelect: (serviceId: string) => void;
  handlePackageSelect: (packageId: string) => void;
  handleStylistSelect: (itemId: string, stylistId: string) => void;
  handleCustomServiceToggle: (packageId: string, serviceId: string) => void;
  handleProceedToCheckout: () => void;
  handleBackToServices: () => void;
  handlePaymentComplete: (appointmentId?: string) => void;
  handleRemoveService: (serviceId: string) => void;
  handleRemovePackage: (packageId: string) => void;
  resetState: () => void;
  handleCloseAppointment: () => void;
  openAddAppointment: () => void;
}

const AppointmentWorkflowContext = createContext<AppointmentWorkflowContextType | undefined>(undefined);

export function useAppointmentWorkflow() {
  const context = useContext(AppointmentWorkflowContext);
  if (context === undefined) {
    throw new Error("useAppointmentWorkflow must be used within an AppointmentWorkflowProvider");
  }
  return context;
}

interface AppointmentWorkflowProviderProps {
  children: ReactNode;
  initialScreen?: ScreenType;
  onSaveAppointment: () => Promise<string | null>;
  services: Service[];
  packages: Package[];
}

export function AppointmentWorkflowProvider({
  children,
  initialScreen = SCREEN.SERVICE_SELECTION,
  onSaveAppointment,
  services,
  packages
}: AppointmentWorkflowProviderProps) {
  // State
  const [currentScreen, setCurrentScreen] = React.useState<ScreenType>(initialScreen);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = React.useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = React.useState<string[]>([]);
  const [selectedStylists, setSelectedStylists] = React.useState<Record<string, string>>({});
  const [customizedServices, setCustomizedServices] = React.useState<Record<string, string[]>>({});
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = React.useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "online">("cash");
  const [discountType, setDiscountType] = React.useState<DiscountType | string>("none");
  const [discountValue, setDiscountValue] = React.useState<number>(0);
  const [appointmentNotes, setAppointmentNotes] = React.useState<string>("");
  const [newAppointmentId, setNewAppointmentId] = React.useState<string | null>(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = React.useState<boolean>(false);

  // Action handlers
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

  const resetState = () => {
    setSelectedCustomer(null);
    setSelectedServices([]);
    setSelectedPackages([]);
    setSelectedStylists({});
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setPaymentMethod("cash");
    setDiscountType("none");
    setDiscountValue(0);
    setAppointmentNotes("");
    setCustomizedServices({});
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
  };

  const handleCloseAppointment = () => {
    setIsAddAppointmentOpen(false);
    resetState();
  };

  const openAddAppointment = () => {
    setIsAddAppointmentOpen(true);
  };

  const value = {
    // State
    currentScreen,
    selectedCustomer,
    selectedServices,
    selectedPackages,
    selectedStylists,
    customizedServices,
    selectedDate,
    selectedTime,
    paymentMethod,
    discountType,
    discountValue,
    appointmentNotes,
    newAppointmentId,
    isAddAppointmentOpen,
    
    // State setters
    setCurrentScreen,
    setSelectedCustomer,
    setSelectedServices,
    setSelectedPackages,
    setSelectedStylists,
    setCustomizedServices,
    setSelectedDate,
    setSelectedTime,
    setPaymentMethod,
    setDiscountType,
    setDiscountValue,
    setAppointmentNotes,
    setNewAppointmentId,
    setIsAddAppointmentOpen,
    
    // Action handlers
    handleServiceSelect,
    handlePackageSelect,
    handleStylistSelect,
    handleCustomServiceToggle,
    handleProceedToCheckout,
    handleBackToServices,
    handlePaymentComplete,
    handleRemoveService,
    handleRemovePackage,
    resetState,
    handleCloseAppointment,
    openAddAppointment
  };

  return (
    <AppointmentWorkflowContext.Provider value={value}>
      {children}
    </AppointmentWorkflowContext.Provider>
  );
}
