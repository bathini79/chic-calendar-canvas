
import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { ServiceSelector } from "./bookings/components/ServiceSelector";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatTime, isSameDay, TOTAL_HOURS } from "./bookings/utils/timeUtils";
import { getTotalPrice, getTotalDuration } from "./bookings/utils/bookingUtils";
import { useAppointmentState } from "./bookings/hooks/useAppointmentState";
import { useCalendarState } from "./bookings/hooks/useCalendarState";
import { CheckoutSection } from "./bookings/components/CheckoutSection";
import { SummaryView } from "./bookings/components/SummaryView";
import TimeSlots from "@/components/admin/bookings/components/TimeSlots";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { useActiveServices } from "./bookings/hooks/useActiveServices";
import { useActivePackages } from "./bookings/hooks/useActivePackages";
import { useAppointmentsByDate } from "./bookings/hooks/useAppointmentsByDate";
import useSaveAppointment from "./bookings/hooks/useSaveAppointment";
import { Appointment, Service, Package, SCREEN } from "./bookings/types";

const initialStats = [
  { label: "Pending Confirmation", value: 0 },
  { label: "Upcoming Bookings", value: 11 },
  { label: "Today's Bookings", value: 5 },
  { label: "Today's Revenue", value: 1950 },
];

type ScreenType = (typeof SCREEN)[keyof typeof SCREEN];

export default function AdminBookings() {
  const [employees, setEmployees] = useState([]);
  const [stats] = useState(initialStats);
  const [clickedCell, setClickedCell] = useState<{
    employeeId: string;
    time: number;
    x: number;
    y: number;
    date?: Date;
  } | null>(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(
    SCREEN.SERVICE_SELECTION
  );
  const [newAppointmentId, setNewAppointmentId] = useState<string | null>(null);

  const { currentDate, nowPosition, goToday, goPrev, goNext } =
    useCalendarState();
  const { data: services } = useActiveServices();
  const { data: packages } = useActivePackages();
  const { data: appointments = [] } = useAppointmentsByDate(currentDate);
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

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .eq("employment_type", "stylist");
        if (error) throw error;
        const employeeWithAvatar = data.map((employee) => ({
          ...employee,
          avatar: employee.name
            .split(" ")
            .map((n) => n[0])
            .join(""),
        }));
        setEmployees(employeeWithAvatar);
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
      }
    };

    fetchEmployees();
  }, []);

  const openAddAppointment = () => {
    if (clickedCell) {
      const hours = Math.floor(clickedCell.time);
      const minutes = Math.round((clickedCell.time - hours) * 60);
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;

      setSelectedDate(clickedCell.date);
      setSelectedTime(timeString);
    }
    setIsAddAppointmentOpen(true);
    setClickedCell(null);
  };

  const closeAddAppointment = () => {
    setIsAddAppointmentOpen(false);
  };

  const handleCellClick = (cell: { employeeId: string; time: number; x: number; y: number; date: Date }) => {
    setClickedCell(cell);
  };

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

  const calculateSelectedItems = () => {
    return [
      ...selectedServices.map((id) => {
        const service = services?.find((s) => s.id === id);
        return service
          ? {
              id,
              name: service.name,
              price: service.selling_price,
              type: "service" as const,
            }
          : null;
      }),
      ...selectedPackages.map((id) => {
        const pkg = packages?.find((p) => p.id === id);
        return pkg
          ? {
              id,
              name: pkg.name,
              price: pkg.price,
              type: "package" as const,
            }
          : null;
      }),
    ].filter(Boolean);
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

  const handleCheckoutFromAppointment = (appointment: Appointment) => {
    const services: string[] = [];
    const packages: string[] = [];
    const stylists: Record<string, string> = {};

    appointment.bookings.forEach(booking => {
      if (booking.service_id) {
        services.push(booking.service_id);
        stylists[booking.service_id] = booking.employee_id;
      }
      if (booking.package_id) {
        packages.push(booking.package_id);
        stylists[booking.package_id] = booking.employee_id;
      }
    });
    setNewAppointmentId(appointment.id);
    setSelectedServices(services);
    setSelectedPackages(packages);
    setSelectedStylists(stylists);
    setPaymentMethod(appointment.payment_method);
    setDiscountType(appointment.discount_type);
    setDiscountValue(appointment.discount_value);
    setAppointmentNotes(appointment.notes || '');
    setSelectedCustomer(appointment.customer || null);
    
    const startDate = new Date(appointment.start_time);
    setSelectedDate(startDate);
    setSelectedTime(format(startDate, 'HH:mm'));

    setSelectedAppointment(null);
    setIsAddAppointmentOpen(true);
    setCurrentScreen(SCREEN.CHECKOUT);
  };

  const onHandleSaveAppointment = async() => {
    const appointmentId = await handleSaveAppointment();
    if(appointmentId){
      closeAddAppointment();
      resetState();
    }
  };

  // This is a temporary prop for the TimeSlots component until we fix the imports
  const timeSlotsProps = {
    employees,
    formatTime,
    TOTAL_HOURS,
    currentDate,
    nowPosition,
    isSameDay,
    appointments,
    setSelectedAppointment,
    setClickedCell: handleCellClick,
    hourLabels: [],
    PIXELS_PER_HOUR: 60,
    handleColumnClick: () => {},
    renderAppointmentBlock: () => <></>
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-gray-50 relative">
        <header className="p-4 border-b bg-white flex justify-between items-center">
          <div className="font-bold text-xl">Define Salon</div>
        </header>
        <StatsPanel stats={stats} />
        <CalendarHeader
          currentDate={currentDate}
          onToday={goToday}
          onPrevious={goPrev}
          onNext={goNext}
        />
        <TimeSlots
          {...timeSlotsProps}
        />
        <AppointmentDetailsDialog
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onOpenChange={() => setSelectedAppointment(null)}
          onCheckout={handleCheckoutFromAppointment}
        />

        {clickedCell && (
          <div
            className="fixed z-50 w-48 rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            style={{
              left: clickedCell.x,
              top: clickedCell.y,
            }}
          >
            <div className="bg-black px-4 py-2 text-sm font-medium text-white">
              {formatTime(clickedCell.time)}
            </div>
            <div
              className="bg-white px-4 py-3 flex items-center space-x-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={openAddAppointment}
            >
              <CalendarIcon className="h-4 w-4 text-gray-600" />
              <span className="text-gray-700">Add Appointment</span>
            </div>
          </div>
        )}

        <div
          className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
            isAddAppointmentOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">New Appointment</h2>
                <button
                  onClick={closeAddAppointment}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              {clickedCell && (
                <p className="text-sm text-muted-foreground mt-1">
                  {format(currentDate, "MMMM d, yyyy")} at{" "}
                  {formatTime(clickedCell.time)}
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
                    appointmentId={newAppointmentId}
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
                    selectedTimeSlots={{ [newAppointmentId || '']: selectedTime }}
                    onSaveAppointment={handleSaveAppointment}
                    onRemoveService={handleRemoveService}
                    onRemovePackage={handleRemovePackage}
                    onBackToServices={handleBackToServices}
                    customizedServices={customizedServices}
                    isExistingAppointment={false}
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
      </div>
    </DndProvider>
  );
}
