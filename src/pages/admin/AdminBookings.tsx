import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { CheckoutDialog } from "./bookings/components/CheckoutDialog";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { PaymentDetails } from "./bookings/components/PaymentDetails";
import { CalendarGrid } from "./bookings/components/CalendarGrid";
import { AppointmentDialog } from "./bookings/components/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getFinalPrice, getTotalPrice, getTotalDuration } from "./bookings/utils/bookingUtils";
import { useAppointmentState } from "./bookings/hooks/useAppointmentState";
import { useCalendarState } from "./bookings/hooks/useCalendarState";
import { START_HOUR } from "./bookings/utils/timeUtils";

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

  const { data: services = [] } = useQuery({
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

  const { data: packages = [] } = useQuery({
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

      const totalDuration = getTotalDuration(
        appointmentState.selectedServices,
        appointmentState.selectedPackages,
        services || [],
        packages || []
      );
      const endDateTime = addMinutes(startDateTime, totalDuration);

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_id: appointmentState.selectedCustomer!.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: "confirmed",
          number_of_bookings: appointmentState.selectedServices.length + appointmentState.selectedPackages.length,
          total_price: getTotalPrice(
            appointmentState.selectedServices,
            appointmentState.selectedPackages,
            services || [],
            packages || []
          ),
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
      resetState();
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
    }
  };

  const handleCheckoutSave = async () => {
    if (checkoutStep === "checkout") {
      setCheckoutStep("payment");
      return;
    }

    if (checkoutStep === "payment") {
      try {
        const finalPrice = getFinalPrice(
          getTotalPrice(
            appointmentState.selectedServices,
            appointmentState.selectedPackages,
            services || [],
            packages || []
          ),
          appointmentState.discountType,
          appointmentState.discountValue
        );

        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            status: "completed",
            payment_method: appointmentState.paymentMethod,
            discount_type: appointmentState.discountType,
            discount_value: appointmentState.discountValue,
            final_price: finalPrice,
            notes: appointmentState.appointmentNotes,
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
            services={services}
            employees={employees}
            selectedStylists={appointmentState.selectedStylists}
            selectedCustomer={appointmentState.selectedCustomer}
            paymentMethod={appointmentState.paymentMethod}
            discountType={appointmentState.discountType}
            discountValue={appointmentState.discountValue}
            appointmentNotes={appointmentState.appointmentNotes}
            getTotalPrice={() => getTotalPrice(appointmentState.selectedServices, appointmentState.selectedPackages, services, packages)}
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

        <AppointmentDialog
          isOpen={isAddAppointmentOpen}
          onClose={() => setIsAddAppointmentOpen(false)}
          currentDate={currentDate}
          clickedCell={clickedCell}
          selectedCustomer={appointmentState.selectedCustomer}
          setSelectedCustomer={appointmentState.setSelectedCustomer}
          showCreateForm={appointmentState.showCreateForm}
          setShowCreateForm={appointmentState.setShowCreateForm}
          selectedServices={appointmentState.selectedServices}
          selectedPackages={appointmentState.selectedPackages}
          selectedStylists={appointmentState.selectedStylists}
          notes={appointmentState.notes}
          setNotes={appointmentState.setNotes}
          onSave={handleSaveAppointment}
          onProceedToCheckout={() => setCurrentScreen(SCREEN.CHECKOUT)}
          onServiceSelect={(id) => appointmentState.setSelectedServices(prev => 
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
          )}
          onPackageSelect={(id) => appointmentState.setSelectedPackages(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
          )}
          onStylistSelect={(itemId, stylistId) => appointmentState.setSelectedStylists(prev => ({
            ...prev,
            [itemId]: stylistId
          }))}
          employees={employees}
          services={services}
          packages={packages}
        />

        <AppointmentDetailsDialog
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onOpenChange={() => setSelectedAppointment(null)}
        />

        <CheckoutDialog
          open={showCheckout}
          onOpenChange={setShowCheckout}
          paymentMethod={appointmentState.paymentMethod}
          onPaymentMethodChange={appointmentState.setPaymentMethod}
          discountType={appointmentState.discountType}
          onDiscountTypeChange={appointmentState.setDiscountType}
          discountValue={appointmentState.discountValue}
          onDiscountValueChange={appointmentState.setDiscountValue}
          totalPrice={getTotalPrice(appointmentState.selectedServices, appointmentState.selectedPackages, services, packages)}
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
