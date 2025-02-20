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
import { CalendarGrid } from "./bookings/components/CalendarGrid";
import { QuickAddMenu } from "./bookings/components/QuickAddMenu";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import type { Customer } from "./bookings/types";
import { formatTime, START_HOUR } from "./bookings/utils/timeUtils";
import { getTotalPrice, getTotalDuration } from "./bookings/utils/bookingUtils";
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
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<
    "checkout" | "payment" | "completed"
  >("checkout");
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(SCREEN.SERVICE_SELECTION);

  const { currentDate, setCurrentDate, nowPosition, goToday, goPrev, goNext } = useCalendarState();
  const appointmentState = useAppointmentState();

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

  const handleEventUpdate = (eventId: number, changes: any) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, ...changes } : ev))
    );
  };

  const handleColumnClick = (e: React.MouseEvent, empId: number) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let clickedTime = START_HOUR + offsetY / 60;
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

      appointmentState.setSelectedDate(clickedCell.date);
      appointmentState.setSelectedTime(timeString);
    }
    setIsAddAppointmentOpen(true);
    setClickedCell(null);
  };

  const handleSaveAppointment = async () => {
    if (!appointmentState.selectedDate || !appointmentState.selectedTime || !appointmentState.selectedCustomer) {
      toast.error("Please select a date, time and customer");
      return;
    }

    try {
      const startDateTime = new Date(
        `${format(appointmentState.selectedDate!, "yyyy-MM-dd")} ${appointmentState.selectedTime}`
      );
      if (isNaN(startDateTime.getTime())) {
        console.error(
          `Invalid date generated, date: ${format(
            appointmentState.selectedDate!,
            "yyyy-MM-dd"
          )}, time: ${appointmentState.selectedTime}`
        );
        return;
      }

      const totalDuration = getTotalDuration(appointmentState.selectedServices, appointmentState.selectedPackages, services || [], packages || []);
      const endDateTime = addMinutes(startDateTime, totalDuration);

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_id: appointmentState.selectedCustomer!.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: "confirmed",
          number_of_bookings: appointmentState.selectedServices.length + appointmentState.selectedPackages.length,
          total_price: getTotalPrice(appointmentState.selectedServices, appointmentState.selectedPackages, services || [], packages || []),
          total_duration: totalDuration,
        })
        .select();

      if (appointmentError) {
        console.error("Error inserting appointment:", appointmentError);
        toast.error("Failed to create appointment. Please try again.");
        throw appointmentError;
      }

      const appointmentId = appointmentData[0].id;
      let currentStartTime = startDateTime;

      const allSelectedItems = [
        ...appointmentState.selectedServices.map((id) => ({ type: "service", id })),
        ...appointmentState.selectedPackages.map((id) => ({ type: "package", id })),
      ];

      allSelectedItems.sort((a, b) => {
        let durationA =
          (a.type === "service"
            ? services?.find((s) => s.id === a.id)?.duration
            : packages?.find((p) => p.id === a.id)?.duration) || 0;
        let durationB =
          (b.type === "service"
            ? services?.find((s) => s.id === b.id)?.duration
            : packages?.find((p) => p.id === b.id)?.duration) || 0;
        return durationA - durationB;
      });

      for (const item of allSelectedItems) {
        let bookingEndTime: Date;
        let bookingData;
        let duration: number;

        if (item.type === "service") {
          const service = services?.find((s) => s.id === item.id);
          if (!service) continue;
          duration = service.duration;
          bookingEndTime = addMinutes(currentStartTime, service.duration);
          bookingData = {
            appointment_id: appointmentId,
            service_id: service.id,
            status: "confirmed",
            price_paid: service.selling_price,
            employee_id: appointmentState.selectedStylists[service.id],
            start_time: currentStartTime.toISOString(),
            end_time: bookingEndTime.toISOString(),
          };
        } else {
          const pkg = packages?.find((p) => p.id === item.id);
          if (!pkg) continue;
          duration = pkg.duration;
          bookingEndTime = addMinutes(currentStartTime, pkg.duration);
          bookingData = {
            appointment_id: appointmentId,
            package_id: pkg.id,
            status: "confirmed",
            price_paid: pkg.price,
            start_time: currentStartTime.toISOString(),
            end_time: bookingEndTime.toISOString(),
          };
        }

        const { error: bookingError } = await supabase
          .from("bookings")
          .insert(bookingData);

        if (bookingError) {
          console.error(`Error inserting ${item.type} booking:`, bookingError);
          toast.error(
            `Failed to create ${item.type} booking. Please try again.`
          );
          throw bookingError;
        }
        currentStartTime = bookingEndTime;
      }

      toast.success("Appointment saved successfully");
      setIsAddAppointmentOpen(false);
      appointmentState.resetState();
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
    }
  };

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
          <PaymentDetails
            paymentCompleted={checkoutStep === 'completed'}
            selectedServices={appointmentState.selectedServices}
            services={services || []}
            employees={employees}
            selectedStylists={appointmentState.selectedStylists}
            selectedCustomer={appointmentState.selectedCustomer}
            paymentMethod={appointmentState.paymentMethod}
            discountType={appointmentState.discountType}
            discountValue={appointmentState.discountValue}
            appointmentNotes={appointmentState.appointmentNotes}
            getTotalPrice={() => getTotalPrice(appointmentState.selectedServices, appointmentState.selectedPackages, services || [], packages || [])}
            getFinalPrice={getFinalPrice}
            onPaymentMethodChange={appointmentState.setPaymentMethod}
            onDiscountTypeChange={appointmentState.setDiscountType}
            onDiscountValueChange={appointmentState.setDiscountValue}
            onNotesChange={appointmentState.setAppointmentNotes}
            onSave={handleCheckoutSave}
          />
        ) : (
          <CalendarGrid
            employees={employees}
            appointments={appointments}
            currentDate={currentDate}
            nowPosition={nowPosition}
            onColumnClick={handleColumnClick}
            onAppointmentClick={setSelectedAppointment}
          />
        )}

        {clickedCell && (
          <QuickAddMenu
            x={clickedCell.x}
            y={clickedCell.y}
            time={clickedCell.time}
            onAddAppointment={openAddAppointment}
          />
        )}

        <AppointmentDetailsDialog
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onOpenChange={() => setSelectedAppointment(null)}
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
                  {formatTime(clickedCell.time)}
                </p>
              )}
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-[40%] border-r overflow-y-auto p-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Select Customer</h3>
                  {!appointmentState.selectedCustomer ? (
                    <CustomerSearch
                      onSelect={(customer) => {
                        appointmentState.setSelectedCustomer(customer);
                        appointmentState.setShowCreateForm(false);
                      }}
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">
                            {appointmentState.selectedCustomer.full_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {appointmentState.selectedCustomer.email}
                          </p>
                        </div>
                        <button
                          className="text-sm text-gray-600 hover:text-gray-900"
                          onClick={() => appointmentState.setSelectedCustomer(null)}
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
                  <h3 className="text-lg font-medium">Select Services</h3>
                  {currentScreen === SCREEN.SERVICE_SELECTION ? (
                    <ServiceSelector
                      onServiceSelect={appointmentState.setSelectedServices}
                      onPackageSelect={appointmentState.setSelectedPackages}
                      onStylistSelect={appointmentState.setSelectedStylists}
                      selectedServices={appointmentState.selectedServices}
                      selectedPackages={appointmentState.selectedPackages}
                      selectedStylists={appointmentState.selectedStylists}
                      stylists={employees}
                    />
                  ) : null}

                  {currentScreen === SCREEN.CHECKOUT ? <p>hello</p> : null}

                  <div className="space-y-4">
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                      type="text"
                      value={appointmentState.notes}
                      onChange={(e) => appointmentState.setNotes(e.target.value)}
                      placeholder="Add notes for this appointment"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddAppointmentOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveAppointment}>
                      Save Appointment
                    </Button>
                    <Button onClick={() => setCurrentScreen(SCREEN.CHECKOUT)}>
                      Proceed to Checkout
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CheckoutDialog
          open={showCheckout}
          onOpenChange={setShowCheckout}
          paymentMethod={appointmentState.paymentMethod}
          onPaymentMethodChange={(value) => appointmentState.setPaymentMethod(value)}
          discountType={appointmentState.discountType}
          onDiscountTypeChange={(value) => appointmentState.setDiscountType(value)}
          discountValue={appointmentState.discountValue}
          onDiscountValueChange={(value) => appointmentState.setDiscountValue(value)}
          totalPrice={getTotalPrice(appointmentState.selectedServices, appointmentState.selectedPackages, services || [], packages || [])}
          notes={appointmentState.appointmentNotes}
          onNotesChange={appointmentState.setAppointmentNotes}
          onSave={handleCheckoutSave}
          onCancel={() => {
            setShowCheckout(false);
            setCheckoutStep("checkout");
          }}
          step={checkoutStep}
        />
      </div>
    </DndProvider>
  );
}
