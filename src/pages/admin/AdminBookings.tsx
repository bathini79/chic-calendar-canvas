import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format, addMinutes } from "date-fns";
import { PaymentSection } from "./bookings/components/PaymentSection";
import { CalendarView } from "./bookings/components/CalendarView";
import { AppointmentForm } from "./bookings/components/AppointmentForm";
import type { Customer } from "./bookings/types";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const PIXELS_PER_HOUR = 60;

function formatTime(time: number) {
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  const period = hours >= 12 ? "pm" : "am";
  let displayHour = hours % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")}${period}`;
}

const hourLabels = Array.from({ length: 12 }, (_, i) => i + START_HOUR);

const initialEvents = [
  { id: 1, employeeId: 1, title: "Haircut", startHour: 9, duration: 1 },
  { id: 2, employeeId: 2, title: "Facial", startHour: 9.5, duration: 1.5 },
  { id: 3, employeeId: 3, title: "Manicure", startHour: 13, duration: 1 },
];

const initialStats = [
  { label: "Pending Confirmation", value: 0 },
  { label: "Upcoming Bookings", value: 11 },
  { label: "Today's Bookings", value: 5 },
  { label: "Today's Revenue", value: 1950 },
];

export default function AdminBookings() {
  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState(initialEvents);
  const [stats] = useState(initialStats);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 1, 11));
  const [nowPosition, setNowPosition] = useState<number | null>(null);
  const [clickedCell, setClickedCell] = useState<{
    employeeId: number;
    time: number;
    x: number;
    y: number;
    date?: Date;
  } | null>(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedStylists, setSelectedStylists] = useState<
    Record<string, string>
  >({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [checkoutStep, setCheckoutStep] = useState<'checkout' | 'payment' | 'completed'>('checkout');
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  useEffect(() => {
    const updateNow = () => {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
        setNowPosition((currentHour - START_HOUR) * PIXELS_PER_HOUR);
      } else {
        setNowPosition(null);
      }
    };
    updateNow();
    const intervalId = setInterval(updateNow, 60000);
    return () => clearInterval(intervalId);
  }, []);

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

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };
  const goNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

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
  };

  const getTotalPrice = () => {
    let total = 0;

    selectedServices.forEach((serviceId) => {
      const service = services?.find((s) => s.id === serviceId);
      if (service) {
        total += service.selling_price;
      }
    });

    selectedPackages.forEach((packageId) => {
      const pkg = packages?.find((p) => p.id === packageId);
      if (pkg) {
        total += pkg.price;
      }
    });

    return total;
  };

  const getTotalDuration = () => {
    let totalDuration = 0;

    selectedServices.forEach((serviceId) => {
      const service = services?.find((s) => s.id === serviceId);
      if (service) {
        totalDuration += service.duration;
      }
    });

    selectedPackages.forEach((packageId) => {
      const pkg = packages?.find((p) => p.id === packageId);
      if (pkg) {
        totalDuration += pkg.duration;
      }
    });

    return totalDuration;
  };

  const handleSaveAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedCustomer) {
      toast.error("Please select a date, time and customer");
      return;
    }

    try {
      const startDateTime = new Date(`${format(selectedDate!, 'yyyy-MM-dd')} ${selectedTime}`);
      if (isNaN(startDateTime.getTime())) {
        console.error(`Invalid date generated, date: ${format(selectedDate!, 'yyyy-MM-dd')}, time: ${selectedTime}`);
        return;
      }
      
      const totalDuration = getTotalDuration();
      const endDateTime = addMinutes(startDateTime, totalDuration);

      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          customer_id: selectedCustomer!.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'confirmed',
          number_of_bookings: selectedServices.length + selectedPackages.length,
          total_price: getTotalPrice(),
          total_duration: totalDuration
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
        ...selectedServices.map((id) => ({ type: "service", id })),
        ...selectedPackages.map((id) => ({ type: "package", id })),
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
            employee_id: selectedStylists[service.id],
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
        console.log(`${item.type}  bookingEndTime`, bookingEndTime);

        currentStartTime = bookingEndTime;
      }

      toast.success("Appointment saved successfully");
      setIsAddAppointmentOpen(false);
      
      setSelectedServices([]);
      setSelectedPackages([]);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setNotes("");
      setPaymentMethod('cash');
      setDiscountType('none');
      setDiscountValue(0);
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
    }
  };

  const handleCheckoutSave = async () => {
    if (checkoutStep === 'checkout') {
      setCheckoutStep('payment');
      return;
    }

    if (checkoutStep === 'payment') {
      try {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            status: 'completed',
            payment_method: paymentMethod,
            discount_type: discountType,
            discount_value: discountValue,
            notes: appointmentNotes
          })
          .eq('id', selectedAppointment.id);

        if (updateError) throw updateError;

        setCheckoutStep('completed');
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

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 hover:bg-green-200 border-green-300";
      case "canceled":
        return "bg-red-100 hover:bg-red-200 border-red-300";
      default:
        return "bg-purple-100 hover:bg-purple-200 border-purple-300";
    }
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const renderAppointmentBlock = (appointment: any, booking: any) => {
    const statusColor = getAppointmentStatusColor(appointment.status);
    const duration = booking.service?.duration || booking.package?.duration || 60;
    const startHour = new Date(booking.start_time).getHours() + 
                   new Date(booking.start_time).getMinutes() / 60;
    
    const topPositionPx = ((startHour - START_HOUR) * PIXELS_PER_HOUR);
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

  const handleProceedToCheckout = () => {
    setIsAddAppointmentOpen(false);
    setShowCheckout(true);
  };

  const getFinalPrice = () => {
    const totalPrice = getTotalPrice();
    return discountType === 'percentage'
      ? totalPrice * (1 - (discountValue / 100))
      : Math.max(0, totalPrice - discountValue);
  };

  const paymentCompleted = () => {
    setShowPaymentSection(false);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-gray-50 relative">
        <header className="p-4 border-b bg-white flex justify-between items-center">
          <div className="font-bold text-xl">Define Salon</div>
        </header>

        <StatsPanel stats={initialStats} />
        
        <CalendarHeader
          currentDate={currentDate}
          onToday={goToday}
          onPrevious={goPrev}
          onNext={goNext}
        />

        {showPaymentSection ? (
          <PaymentSection
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            discountType={discountType}
            onDiscountTypeChange={setDiscountType}
            discountValue={discountValue}
            onDiscountValueChange={setDiscountValue}
            notes={appointmentNotes}
            onNotesChange={setAppointmentNotes}
            totalPrice={getTotalPrice()}
            onBack={() => setShowPaymentSection(false)}
            onSave={handleCheckoutSave}
          />
        ) : (
          <CalendarView
            employees={employees}
            appointments={appointments}
            currentDate={currentDate}
            onColumnClick={handleColumnClick}
            nowPosition={nowPosition}
            renderAppointmentBlock={renderAppointmentBlock}
            hourLabels={hourLabels}
            START_HOUR={START_HOUR}
            TOTAL_HOURS={TOTAL_HOURS}
            PIXELS_PER_HOUR={PIXELS_PER_HOUR}
            formatTime={formatTime}
            isSameDay={isSameDay}
          />
        )}

        <AppointmentForm
          isOpen={isAddAppointmentOpen}
          onClose={closeAddAppointment}
          selectedCustomer={selectedCustomer}
          onCustomerSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCreateForm(false);
          }}
          onCustomerChange={() => setSelectedCustomer(null)}
          selectedServices={selectedServices}
          selectedPackages={selectedPackages}
          selectedStylists={selectedStylists}
          employees={employees}
          onServiceSelect={handleServiceSelect}
          onPackageSelect={handlePackageSelect}
          onStylistSelect={handleStylistSelect}
          onSave={handleSaveAppointment}
          onProceedToCheckout={handleProceedToCheckout}
          clickedCell={clickedCell}
        />

        <Dialog
          open={!!selectedAppointment}
          onOpenChange={() => setSelectedAppointment(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-4 p-4">
                <div>
                  <Badge
                    variant={
                      selectedAppointment.status === "confirmed"
                        ? "default"
                        : selectedAppointment.status === "canceled"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {selectedAppointment.status.toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-medium">Customer</h3>
                  <p>{selectedAppointment.customer?.full_name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedAppointment.customer?.email}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium">Date & Time</h3>
                  <p>
                    {format(new Date(selectedAppointment.start_time), "PPpp")}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium">Services</h3>
                  <div className="space-y-2">
                    {selectedAppointment.bookings.map((booking: any) => (
                      <div key={booking.id} className="border rounded p-2">
                        <div className="font-medium">
                          {booking.service?.name || booking.package?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          with {booking.employee?.name}
                        </div>
                        <div className="text-sm">
                          Duration:{" "}
                          {booking.service?.duration ||
                            booking.package?.duration}
                          min
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedAppointment.notes && (
                  <div>
                    <h3 className="font-medium">Notes</h3>
                    <p className="text-gray-600">{selectedAppointment.notes}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-medium">Total</h3>
                  <p className="text-lg font-semibold">
                    ${selectedAppointment.total_price}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}
