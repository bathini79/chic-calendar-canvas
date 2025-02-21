import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { CustomerSearch } from "./bookings/components/CustomerSearch";
import { ServiceSelector } from "./bookings/components/ServiceSelector";
import { PaymentDetails } from "./bookings/components/PaymentDetails";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useAppointmentState } from "./bookings/hooks/useAppointmentState";
import { useCalendarState } from "./bookings/hooks/useCalendarState";
import { useAppointmentActions } from "./bookings/hooks/useAppointmentActions";
import { formatTime, isSameDay, START_HOUR, END_HOUR, TOTAL_HOURS, PIXELS_PER_HOUR,hourLabels } from "./bookings/utils/timeUtils";
import { getTotalPrice, getTotalDuration, getFinalPrice, getAppointmentStatusColor } from "./bookings/utils/bookingUtils";
import { CheckoutSection } from "./bookings/components/CheckoutSection";
import { SummaryView } from "./bookings/components/SummaryView";
import type { Appointment, Booking } from "./bookings/types";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const [events, setEvents] = useState([]);
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
  const [checkoutStep, setCheckoutStep] = useState<
    "checkout" | "payment" | "completed"
  >("checkout");
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(SCREEN.SERVICE_SELECTION);
  const [newAppointmentId, setNewAppointmentId] = useState<string | null>(null);

  const { currentDate, setCurrentDate, nowPosition, goToday, goPrev, goNext } = useCalendarState();
  const { fetchAppointmentDetails, updateAppointmentStatus } = useAppointmentActions();
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

  function formatCurrentDate(date: Date) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const dayOfWeek = days[date.getDay()];
    const dayOfMonth = date.getDate();
    const month = months[date.getMonth()];
    return `${dayOfWeek} ${dayOfMonth} ${month}`;
  }

  const handleEventUpdate = (eventId: number, changes: any) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, ...changes } : ev))
    );
  };

  const handleBookingClick = async (booking: Booking) => {
    const appointment = await fetchAppointmentDetails(booking.appointment_id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setSelectedCustomer(appointment.customer);
      setSelectedDate(new Date(appointment.start_time));
      setSelectedTime(format(new Date(appointment.start_time), 'HH:mm'));
      setDiscountType(appointment.discount_type || 'none');
      setDiscountValue(appointment.discount_value || 0);
      setPaymentMethod(appointment.payment_method || 'cash');
      setAppointmentNotes(appointment.notes || '');
      
      // Set selected services and packages
      const selectedServiceIds = appointment.bookings
        .filter(b => b.service_id)
        .map(b => b.service_id!);
      const selectedPackageIds = appointment.bookings
        .filter(b => b.package_id)
        .map(b => b.package_id!);
      
      setSelectedServices(selectedServiceIds);
      setSelectedPackages(selectedPackageIds);

      // Set selected stylists
      const stylistsMap = appointment.bookings.reduce((acc, booking) => {
        if (booking.service_id) {
          acc[booking.service_id] = booking.employee_id;
        }
        if (booking.package_id) {
          acc[booking.package_id] = booking.employee_id;
        }
        return acc;
      }, {} as Record<string, string>);
      
      setSelectedStylists(stylistsMap);
      setIsAddAppointmentOpen(true);
    }
  };

  const handleColumnClick = (e: React.MouseEvent, empId: number) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let clickedTime = START_HOUR + offsetY / PIXELS_PER_HOUR;
    clickedTime = Math.round(clickedTime * 4) / 4;

    const hours = Math.floor(clickedTime);
    const minutes = Math.round((clickedTime - hours) * 60);
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;

    setSelectedDate(currentDate);
    setSelectedTime(timeString);
    setIsAddAppointmentOpen(true);
  };

  const handleComplete = async (appointmentId: string, bookingIds: string[]) => {
    await updateAppointmentStatus(appointmentId, 'completed', bookingIds);
    setIsAddAppointmentOpen(false);
    resetState();
  };

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

  const renderAppointmentBlock = (appointment: any, booking: any) => {
    const statusColor = getAppointmentStatusColor(appointment.status);
    const duration =
      booking.service?.duration || booking.package?.duration || 60;
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
          handleBookingClick(booking)
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

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowCheckout(true);
    setCheckoutStep("checkout");
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
              paymentCompleted={checkoutStep === "completed"}
              selectedServices={selectedServices}
              services={services || []}
              employees={employees}
              selectedStylists={selectedStylists}
              selectedCustomer={selectedCustomer}
              paymentMethod={paymentMethod}
              discountType={discountType}
              discountValue={discountValue}
              appointmentNotes={appointmentNotes}
              getTotalPrice={() =>
                getTotalPrice(
                  selectedServices,
                  selectedPackages,
                  services || [],
                  packages || []
                )
              }
              getFinalPrice={() =>
                getFinalPrice(
                  getTotalPrice(
                    selectedServices,
                    selectedPackages,
                    services || [],
                    packages || []
                  ),
                  discountType,
                  discountValue
                )
              }
              onPaymentMethodChange={setPaymentMethod}
              onDiscountTypeChange={setDiscountType}
              onDiscountValueChange={setDiscountValue}
              onNotesChange={setAppointmentNotes}
              onSave={handleAppointmentClick}
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
                {hourLabels.map((hr) => (
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

                  {nowPosition !== null &&
                    isSameDay(currentDate, new Date()) && (
                      <div
                        className="absolute left-0 right-0 h-[2px] bg-red-500 z-20"
                        style={{ top: nowPosition }}
                      />
                    )}

                  {appointments.map((appointment) =>
                    appointment.bookings.map((booking) => {
                      if (booking.employee?.id !== emp.id) return null;

                      const startTime = new Date(booking.start_time);
                      const startHour =
                        startTime.getHours() + startTime.getMinutes() / 60;
                      const duration =
                        booking.service?.duration ||
                        booking.package?.duration ||
                        60;
                      const topPositionPx =
                        (startHour - START_HOUR) * PIXELS_PER_HOUR;
                      const heightPx = (duration / 60) * PIXELS_PER_HOUR;

                      return renderAppointmentBlock(appointment, booking);
                    })
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
              onClick={() => {
                setSelectedAppointment(null);
                setSelectedCustomer(null);
                setSelectedServices([]);
                setSelectedPackages([]);
                setSelectedStylists({});
                setDiscountType('none');
                setDiscountValue(0);
                setPaymentMethod('cash');
                setAppointmentNotes('');
                openAddAppointment()
              }}
            >
              <CalendarIcon className="h-4 w-4 text-gray-600" />
              <span className="text-gray-700">Add Appointment</span>
            </div>
          </div>
        )}

        {isAddAppointmentOpen && (
          <div className="fixed inset-0 bg-black/50 z-50">
            <div className="absolute right-0 top-0 h-full w-[600px] bg-white shadow-xl">
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">
                    {selectedAppointment ? 'Edit Appointment' : 'New Appointment'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsAddAppointmentOpen(false);
                      setSelectedAppointment(null);
                      resetState();
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {currentScreen === SCREEN.SERVICE_SELECTION && (
                    <>
                      <CustomerSearch
                        onSelect={setSelectedCustomer}
                        selectedCustomer={selectedCustomer}
                      />
                      <ServiceSelector
                        selectedServices={selectedServices}
                        selectedPackages={selectedPackages}
                        selectedStylists={selectedStylists}
                        onServiceSelect={(id) => setSelectedServices(prev => 
                          prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
                        )}
                        onPackageSelect={(id) => setSelectedPackages(prev =>
                          prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
                        )}
                        onStylistSelect={(itemId, stylistId) => setSelectedStylists(prev => ({
                          ...prev,
                          [itemId]: stylistId
                        }))}
                        stylists={employees}
                      />
                    </>
                  )}

                  {currentScreen === SCREEN.CHECKOUT && (
                    <CheckoutSection
                      appointmentId={selectedAppointment?.id || newAppointmentId}
                      selectedServices={selectedServices}
                      selectedPackages={selectedPackages}
                      services={services || []}
                      packages={packages || []}
                      onPaymentComplete={() => {
                        setCurrentScreen(SCREEN.SUMMARY);
                        setSelectedAppointment(null);
                        resetState();
                      }}
                    />
                  )}

                  {currentScreen === SCREEN.SUMMARY && (
                    <SummaryView
                      appointmentId={selectedAppointment?.id || newAppointmentId || ''}
                      selectedItems={[]}
                      subtotal={0}
                      discountAmount={0}
                      total={0}
                      paymentMethod="cash"
                      discountType="none"
                      discountValue={0}
                      completedAt={new Date().toISOString()}
                    />
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-2">
                  {selectedAppointment?.status === 'confirmed' && (
                    <Button
                      onClick={() => handleComplete(
                        selectedAppointment.id,
                        selectedAppointment.bookings.map(b => b.id)
                      )}
                      className="flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Appointment
                    </Button>
                  )}
                  <Button onClick={() => setCurrentScreen(SCREEN.CHECKOUT)}>
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );

  const openAddAppointment = () => {
    setIsAddAppointmentOpen(true);
    setClickedCell(null);
  };

  const closeAddAppointment = () => {
    setIsAddAppointmentOpen(false);
  };
}
