
import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { CheckoutDialog } from "./bookings/components/CheckoutDialog";
import { CustomerSearch } from "./bookings/components/CustomerSearch";
import { ServiceSelector } from "./bookings/components/ServiceSelector";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { PaymentDetails } from "./bookings/components/PaymentDetails";
import { Button } from "@/components/ui/button";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import type { Customer, Service, Package, Appointment } from "./bookings/types";
import { getTotalPrice, getTotalDuration, getFinalPrice, getAppointmentStatusColor } from "./bookings/utils/bookingUtils";
import { START_HOUR, END_HOUR, TOTAL_HOURS, PIXELS_PER_HOUR, formatTime, isSameDay } from "./bookings/utils/timeUtils";
import { useAppointmentState } from "./bookings/hooks/useAppointmentState";
import { useCalendarState } from "./bookings/hooks/useCalendarState";

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
};

export default function AdminBookings() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats] = useState(initialStats);
  const [clickedCell, setClickedCell] = useState<{
    employeeId: number;
    time: number;
    x: number;
    y: number;
    date?: Date;
  } | null>(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(SCREEN.SERVICE_SELECTION);

  // Using our custom hooks
  const {
    currentDate,
    nowPosition,
    goToday,
    goPrev,
    goNext,
  } = useCalendarState();

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
    checkoutStep,
    setCheckoutStep,
    resetState,
  } = useAppointmentState();

  // Query for services and packages
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await supabase.from('services').select('*').eq('status', 'active');
      return data || [];
    }
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data } = await supabase.from('packages').select('*').eq('status', 'active');
      return data || [];
    }
  });

  // Query for appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', format(currentDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles(*),
          bookings (
            *,
            service:services (*),
            package:packages (*),
            employee:employees (*)
          )
        `)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());

      return data || [];
    }
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
    resetState();
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackages(prev =>
      prev.includes(packageId)
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    );
  };

  const handleStylistSelect = (serviceId: string, stylistId: string) => {
    setSelectedStylists(prev => ({
      ...prev,
      [serviceId]: stylistId
    }));
  };

  const handleCheckoutSave = async () => {
    if (checkoutStep === "checkout") {
      setCheckoutStep("payment");
      return;
    }

    if (checkoutStep === "payment") {
      try {
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            status: "completed",
            payment_method: paymentMethod,
            discount_type: discountType,
            discount_value: discountValue,
            notes: appointmentNotes,
          })
          .eq("id", selectedAppointment?.id);

        if (updateError) throw updateError;

        setCheckoutStep("completed");
        toast.success("Payment completed successfully");
      } catch (error: any) {
        console.error("Error completing payment:", error);
        toast.error(error.message || "Failed to complete payment");
      }
    }
  };

  const renderAppointmentBlock = (appointment: Appointment, booking: any) => {
    const statusColor = getAppointmentStatusColor(appointment.status);
    const duration = booking.service?.duration || booking.package?.duration || 60;
    const startHour =
      new Date(booking.start_time).getHours() +
      new Date(booking.start_time).getMinutes() / 60;

    const topPositionPx = (startHour - START_HOUR) * PIXELS_PER_HOUR;
    const heightPx = (duration / 60) * PIXELS_PER_HOUR;

    return (
      <div
        key={booking.id}
        className={`absolute left-2 right-2 rounded border ${statusColor} cursor-pointer z-10 overflow-hidden`}
        style={{
          top: `${topPositionPx}px`,
          height: `${heightPx}px`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedAppointment(appointment);
        }}
      >
        <div className="p-2 text-xs">
          <div className="font-medium truncate">
            {appointment.customer?.full_name}
          </div>
          <div className="truncate text-gray-600">
            {booking.service?.name || booking.package?.name}
          </div>
        </div>
      </div>
    );
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

        {showPaymentSection ? (
          <div className="flex-1 overflow-auto p-6">
            <PaymentDetails
              paymentCompleted={checkoutStep === 'completed'}
              selectedServices={selectedServices}
              services={services}
              employees={employees}
              selectedStylists={selectedStylists}
              selectedCustomer={selectedCustomer}
              paymentMethod={paymentMethod}
              discountType={discountType}
              discountValue={discountValue}
              appointmentNotes={appointmentNotes}
              getTotalPrice={() => getTotalPrice(selectedServices, selectedPackages, services, packages)}
              getFinalPrice={() => getFinalPrice(getTotalPrice(selectedServices, selectedPackages, services, packages), discountType, discountValue)}
              onPaymentMethodChange={setPaymentMethod}
              onDiscountTypeChange={setDiscountType}
              onDiscountValueChange={setDiscountValue}
              onNotesChange={setAppointmentNotes}
              onSave={handleCheckoutSave}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="flex">
              <div className="w-16 border-r" />
              {employees.map((emp: any) => (
                <div
                  key={emp.id}
                  className="flex-1 border-r flex items-center justify-center p-2"
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">
                      {emp.avatar}
                    </div>
                    <div className="text-xs font-medium text-gray-700">
                      {emp.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex">
              <div className="w-16 border-r">
                {Array.from({ length: 12 }, (_, i) => i + START_HOUR).map((hr) => (
                  <div
                    key={hr}
                    className="h-[60px] flex items-center justify-end pr-1 text-[10px] text-gray-700 font-bold border-b"
                  >
                    {formatTime(hr)}
                  </div>
                ))}
              </div>

              {employees.map((emp: any) => (
                <div
                  key={emp.id}
                  className="flex-1 border-r relative"
                  style={{
                    minWidth: "150px",
                    height: TOTAL_HOURS * PIXELS_PER_HOUR,
                  }}
                  onClick={(e) => handleColumnClick(e, emp.id)}
                >
                  {Array.from({ length: TOTAL_HOURS * 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="absolute left-0 right-0 border-b"
                      style={{ top: idx * 15 }}
                    />
                  ))}

                  {nowPosition !== null && isSameDay(currentDate, new Date()) && (
                    <div
                      className="absolute left-0 right-0 h-[2px] bg-red-500 z-20"
                      style={{ top: nowPosition }}
                    />
                  )}

                  {appointments.map((appointment) =>
                    appointment.bookings.map((booking: any) => {
                      if (booking.employee?.id !== emp.id) return null;
                      return renderAppointmentBlock(appointment, booking);
                    })
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <AppointmentDetailsDialog
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onOpenChange={() => setSelectedAppointment(null)}
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
              <span className="text-gray-700">Add Appointment</span>
            </div>
          </div>
        )}

        <CheckoutDialog
          open={showCheckout}
          onOpenChange={setShowCheckout}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          discountType={discountType}
          onDiscountTypeChange={setDiscountType}
          discountValue={discountValue}
          onDiscountValueChange={setDiscountValue}
          totalPrice={getTotalPrice(selectedServices, selectedPackages, services, packages)}
          notes={appointmentNotes}
          onNotesChange={setAppointmentNotes}
          onSave={handleCheckoutSave}
          onCancel={() => {
            setShowCheckout(false);
            setCheckoutStep("checkout");
          }}
          step={checkoutStep}
        />

        {isAddAppointmentOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">New Appointment</h2>
                  <button
                    onClick={closeAddAppointment}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <CustomerSearch
                    onSelect={(customer) => {
                      setSelectedCustomer(customer);
                      setShowCreateForm(false);
                    }}
                  />

                  {selectedCustomer && (
                    <ServiceSelector
                      onServiceSelect={handleServiceSelect}
                      onPackageSelect={handlePackageSelect}
                      onStylistSelect={handleStylistSelect}
                      selectedServices={selectedServices}
                      selectedPackages={selectedPackages}
                      selectedStylists={selectedStylists}
                      stylists={employees}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}
