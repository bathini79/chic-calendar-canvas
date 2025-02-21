import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { CustomerSearch } from "./bookings/components/CustomerSearch";
import { ServiceSelector } from "./bookings/components/ServiceSelector";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { CalendarGrid } from "./bookings/components/CalendarGrid";
import { EmployeeHeader } from "./bookings/components/EmployeeHeader";
import { AddAppointmentPopover } from "./bookings/components/AddAppointmentPopover";
import { useAppointmentState } from "./bookings/hooks/useAppointmentState";
import { useCalendarState } from "./bookings/hooks/useCalendarState";
import { useAppointmentHandlers } from "./bookings/hooks/useAppointmentHandlers";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { isSameDay } from "./bookings/utils/timeUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getTotalPrice,
  getTotalDuration,
  getFinalPrice,
} from "./bookings/utils/bookingUtils";
import { PaymentDetails } from "./bookings/components/PaymentDetails";
import { CheckoutSection } from "./bookings/components/CheckoutSection";
import { SummaryView } from "./bookings/components/SummaryView";

const initialStats = [
  { label: "Pending Confirmation", value: 0 },
  { label: "Upcoming Bookings", value: 11 },
  { label: "Today's Bookings", value: 5 },
  { label: "Today's Revenue", value: 1950 },
];

const SCREEN = {
  SERVICE_SELECTION: "SERVICE_SELECTION",
  CHECKOUT: "CHECKOUT",
  SUMMARY: "SUMMARY",
} as const;

type ScreenType = typeof SCREEN[keyof typeof SCREEN];

export default function AdminBookings() {
  const [employees, setEmployees] = useState([]);
  const [stats] = useState(initialStats);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(SCREEN.SERVICE_SELECTION);
  const [newAppointmentId, setNewAppointmentId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<
    "checkout" | "payment" | "completed"
  >("checkout");
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  const { currentDate, nowPosition, goToday, goPrev, goNext } = useCalendarState();
  const { clickedCell, setClickedCell, handleSaveAppointment } = useAppointmentHandlers();
  const {
    selectedCustomer,
    setSelectedCustomer,
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
    notes,
    setNotes,
    paymentMethod,
    setPaymentMethod,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    appointmentNotes,
    setAppointmentNotes,
    resetState,
  } = useAppointmentState();

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

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", format(currentDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          bookings (
            *,
            service:services (*),
            package:packages (*),
            employee:employees (*)
          ),
          customer:profiles (*)
        `
        )
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString());

      if (error) throw error;
      return data;
    },
  });

  const handleColumnClick = (e: React.MouseEvent, empId: number) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let clickedTime = START_HOUR + offsetY / PIXELS_PER_HOUR;
    clickedTime = Math.round(clickedTime * 4) / 4;

    setClickedCell({
      employeeId: empId,
      time: clickedTime,
      x: e.pageX + 10,
      y: e.pageY - 20,
      date: currentDate,
    });
  };

  const handleAppointmentClick = async (appointment: any) => {
    try {
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles(*),
          bookings (
            *,
            service:services(*),
            package:packages(*),
            employee:employees(*)
          )
        `)
        .eq('id', appointment.id)
        .single();

      if (appointmentError) throw appointmentError;
      setSelectedAppointment(appointmentData);
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      toast.error('Failed to load appointment details');
    }
  };

  const handleProceedToCheckout = async () => {
    try {
      let appointmentId = selectedAppointment?.id;

      if (appointmentId) {
        const startDateTime = new Date(
          `${format(selectedDate!, 'yyyy-MM-dd')} ${selectedTime}`
        );
        const totalDuration = getTotalDuration(
          selectedServices,
          selectedPackages,
          services || [],
          packages || []
        );
        const endDateTime = addMinutes(startDateTime, totalDuration);

        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            customer_id: selectedCustomer!.id,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            status: 'confirmed',
            number_of_bookings: selectedServices.length + selectedPackages.length,
            total_price: getTotalPrice(
              selectedServices,
              selectedPackages,
              services || [],
              packages || []
            ),
            total_duration: totalDuration,
          })
          .eq('id', appointmentId);

        if (updateError) throw updateError;

        const allSelectedItems = [
          ...selectedServices.map(id => ({ type: 'service' as const, id })),
          ...selectedPackages.map(id => ({ type: 'package' as const, id }))
        ];

        for (const item of allSelectedItems) {
          const startDateTime = new Date(
            `${format(selectedDate!, 'yyyy-MM-dd')} ${selectedTime}`
          );
          let bookingEndTime: Date;
          let bookingData: any;

          if (item.type === 'service') {
            const service = services?.find(s => s.id === item.id);
            if (!service) continue;
            bookingEndTime = addMinutes(startDateTime, service.duration);
            bookingData = {
              appointment_id: appointmentId,
              service_id: service.id,
              status: 'confirmed',
              price_paid: service.selling_price,
              employee_id: selectedStylists[service.id],
              start_time: startDateTime.toISOString(),
              end_time: bookingEndTime.toISOString(),
            };
          } else {
            const pkg = packages?.find(p => p.id === item.id);
            if (!pkg) continue;
            bookingEndTime = addMinutes(startDateTime, pkg.duration || 0);
            bookingData = {
              appointment_id: appointmentId,
              package_id: pkg.id,
              status: 'confirmed',
              price_paid: pkg.price,
              employee_id: selectedStylists[pkg.id],
              start_time: startDateTime.toISOString(),
              end_time: bookingEndTime.toISOString(),
            };
          }

          const { error: bookingError } = await supabase
            .from('bookings')
            .upsert(bookingData);

          if (bookingError) throw bookingError;
        }
      } else {
        const appointmentId = await handleSaveAppointment(
          selectedDate!,
          selectedTime!,
          selectedCustomer!,
          selectedServices,
          selectedPackages,
          services || [],
          packages || [],
          selectedStylists
        );
        if (appointmentId) {
          setNewAppointmentId(appointmentId);
        }
      }

      if (appointmentId) {
        setNewAppointmentId(appointmentId);
        setCurrentScreen(SCREEN.CHECKOUT);
      }
    } catch (error) {
      console.error('Error proceeding to checkout:', error);
      toast.error('Failed to proceed to checkout. Please try again.');
    }
  };

  const handleCheckoutSave = async () => {
    if (!selectedAppointment?.id) {
      toast.error("No appointment selected for checkout");
      return;
    }

    if (checkoutStep === "checkout") {
      setCheckoutStep("payment");
      return;
    }

    if (checkoutStep === "payment") {
      try {
        const finalPrice = getFinalPrice(
          getTotalPrice(
            selectedServices,
            selectedPackages,
            services || [],
            packages || []
          ),
          discountType,
          discountValue
        );

        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            status: "completed",
            payment_method: paymentMethod,
            discount_type: discountType,
            discount_value: discountValue,
            final_price: finalPrice,
            notes: appointmentNotes,
          })
          .eq("id", selectedAppointment.id);

        if (updateError) throw updateError;

        setCheckoutStep("completed");
        toast.success("Payment completed successfully");
      } catch (error: any) {
        console.error("Error completing payment:", error);
        toast.error(error.message || "Failed to complete payment");
      }
    }
  };

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

  const calculateSelectedItems = () => {
    return [
      ...selectedServices.map(id => {
        const service = services?.find(s => s.id === id);
        return service ? { 
          id,
          name: service.name,
          price: service.selling_price,
          type: 'service' as const
        } : null;
      }),
      ...selectedPackages.map(id => {
        const pkg = packages?.find(p => p.id === id);
        return pkg ? {
          id,
          name: pkg.name,
          price: pkg.price,
          type: 'package' as const
        } : null;
      })
    ].filter(Boolean);
  };

  const calculateTotals = () => {
    const items = calculateSelectedItems();
    const subtotal = items.reduce((sum, item) => sum + (item?.price || 0), 0);
    const discountAmount = discountType === 'percentage' 
      ? (subtotal * discountValue) / 100 
      : discountType === 'fixed' 
      ? discountValue 
      : 0;
    const total = subtotal - discountAmount;

    return { items, subtotal, discountAmount, total };
  };

  return (
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

      <div className="flex-1 overflow-auto">
        <EmployeeHeader employees={employees} />
        <CalendarGrid
          employees={employees}
          appointments={appointments}
          currentDate={currentDate}
          nowPosition={nowPosition}
          onColumnClick={handleColumnClick}
          onAppointmentClick={handleAppointmentClick}
        />
      </div>

      {clickedCell && (
        <AddAppointmentPopover
          x={clickedCell.x}
          y={clickedCell.y}
          time={clickedCell.time}
          onAddAppointment={() => {
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
          }}
        />
      )}

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={!!selectedAppointment}
        onOpenChange={(open) => {
          if (!open) setSelectedAppointment(null);
        }}
        onEdit={() => {
          setIsAddAppointmentOpen(true);
        }}
      />

      <div
        className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
          isAddAppointmentOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">New Appointment</h2>
              <button
                onClick={() => setIsAddAppointmentOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {clickedCell && (
              <p className="text-sm text-muted-foreground mt-1">
                {format(currentDate, "MMMM d, yyyy")} at{" "}
                {/* {formatTime(clickedCell.time)} */}
              </p>
            )}
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="w-[40%] border-r overflow-y-auto p-6">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Select Customer</h3>
                {!selectedCustomer ? (
                  <CustomerSearch
                    onSelect={(customer) => {
                      setSelectedCustomer(customer);
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">
                          {selectedCustomer.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedCustomer.email}
                        </p>
                      </div>
                      <button
                        className="text-sm text-gray-600 hover:text-gray-900"
                        onClick={() => setSelectedCustomer(null)}
                      >
                        Change Customer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-[60%] overflow-y-auto p-6">
              <div className="space-y-6">
                {currentScreen === SCREEN.SERVICE_SELECTION ? (
                  <>
                    <h3 className="text-lg font-medium">Select Services</h3>
                    <ServiceSelector
                      onServiceSelect={handleServiceSelect}
                      onPackageSelect={handlePackageSelect}
                      onStylistSelect={handleStylistSelect}
                      selectedServices={selectedServices}
                      selectedPackages={selectedPackages}
                      selectedStylists={selectedStylists}
                      stylists={employees}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsAddAppointmentOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleSaveAppointment(
                        selectedDate!,
                        selectedTime!,
                        selectedCustomer!,
                        selectedServices,
                        selectedPackages,
                        services || [],
                        packages || [],
                        selectedStylists
                      )}>
                        Save Appointment
                      </Button>
                      <Button onClick={handleProceedToCheckout}>
                        Proceed to Checkout
                      </Button>
                    </div>
                  </>
                ) : null}

                {currentScreen === SCREEN.CHECKOUT && (newAppointmentId || selectedAppointment?.id) && (
                  <CheckoutSection
                    appointmentId={newAppointmentId || selectedAppointment?.id}
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
                    onPaymentComplete={() => {
                      setCurrentScreen(SCREEN.SUMMARY);
                      setNewAppointmentId(null);
                      resetState();
                    }}
                  />
                )}

                {currentScreen === SCREEN.SUMMARY && (
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-6">Appointment Summary</h3>
                    <SummaryView
                      appointmentId={newAppointmentId || selectedAppointment?.id || ''}
                      selectedItems={calculateSelectedItems()}
                      subtotal={calculateTotals().subtotal}
                      discountAmount={calculateTotals().discountAmount}
                      total={calculateTotals().total}
                      paymentMethod={paymentMethod}
                      discountType={discountType}
                      discountValue={discountValue}
                      completedAt={new Date().toISOString()}
                    />
                    <div className="mt-6 flex justify-end">
                      <Button onClick={() => setCurrentScreen(SCREEN.SERVICE_SELECTION)}>
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
    </div>
  );
}
