import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { CheckoutDialog } from "./bookings/components/CheckoutDialog";
import { CustomerSearch } from "./bookings/components/CustomerSearch";
import { ServiceSelector } from "./bookings/components/ServiceSelector";
import { CalendarIcon, ArrowLeftIcon, ArrowRightIcon } from "./bookings/components/Icons";
import type { Customer } from "./bookings/types";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { addMinutes } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Configuration
const START_HOUR = 8; // 8:00 AM
const END_HOUR = 20; // 8:00 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;
const PIXELS_PER_HOUR = 60;

// Format a fractional hour as "h:mmam/pm"
function formatTime(time: number) {
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  const period = hours >= 12 ? "pm" : "am";
  let displayHour = hours % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")}${period}`;
}

// For the left column: integer hours only (8..19) => 12 hours
const hourLabels = Array.from({ length: 12 }, (_, i) => i + START_HOUR);

// Sample events and stats
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

  // Update now line
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

  // Fetch employees
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

  // Format the displayed date as "Tue 11 Feb"
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

  // Navigation functions
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

  // Column click handling
  function handleColumnClick(e: React.MouseEvent, empId: number) {
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
  }

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

  // Calculate total price
  const getTotalPrice = () => {
    let total = 0;

    // Add service prices
    selectedServices.forEach((serviceId) => {
      const service = services?.find((s) => s.id === serviceId);
      if (service) {
        total += service.selling_price;
      }
    });

    // Add package prices
    selectedPackages.forEach((packageId) => {
      const pkg = packages?.find((p) => p.id === packageId);
      if (pkg) {
        total += pkg.price;
      }
    });

    return total;
  };

  // Calculate total duration
  const getTotalDuration = () => {
    let totalDuration = 0;

    // Add service durations
    selectedServices.forEach((serviceId) => {
      const service = services?.find((s) => s.id === serviceId);
      if (service) {
        totalDuration += service.duration;
      }
    });

    // Add package durations
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

    setShowCheckout(true);
  };

  const handleFinalSave = async () => {
    try {
      const startDateTime = new Date(`${format(selectedDate!, 'yyyy-MM-dd')} ${selectedTime}`);
      if (isNaN(startDateTime.getTime())) {
        console.error(`Invalid date generated, date: ${format(selectedDate!, 'yyyy-MM-dd')}, time: ${selectedTime}`);
        return;
      }
      
      const totalDuration = getTotalDuration();
      const endDateTime = addMinutes(startDateTime, totalDuration);

      // Calculate final price with discounts
      let finalPrice = getTotalPrice();
      if (discountType === 'percentage') {
        finalPrice = finalPrice * (1 - (discountValue / 100));
      } else if (discountType === 'fixed') {
        finalPrice = Math.max(0, finalPrice - discountValue);
      }

      // 1. Insert into appointments table
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          customer_id: selectedCustomer!.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          notes: notes,
          status: 'confirmed',
          number_of_bookings: selectedServices.length + selectedPackages.length,
          total_price: finalPrice,
          total_duration: totalDuration,
          discount_type: discountType,
          discount_value: discountValue,
          payment_method: paymentMethod
        })
        .select();

      if (appointmentError) {
        console.error("Error inserting appointment:", appointmentError);
        toast.error("Failed to create appointment. Please try again.");
        throw appointmentError;
      }

      const appointmentId = appointmentData[0].id;
      let currentStartTime = startDateTime;

      // Iterate through all selected items (services and packages) together
      const allSelectedItems = [
        ...selectedServices.map((id) => ({ type: "service", id })),
        ...selectedPackages.map((id) => ({ type: "package", id })),
      ];

      // Sort all selected items by duration (shortest first)
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
          // item.type === 'package'
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

        // Create the booking
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

        // Update currentStartTime for next booking correctly, to the previous booking's end time.
        currentStartTime = bookingEndTime;
      }

      toast.success("Appointment created successfully");
      setShowCheckout(false);
      setIsAddAppointmentOpen(false);
      toast.success("Appointment created successfully");
      
      // Reset all states
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

        {/* Employee Header */}
        <div className="flex border-b bg-white">
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

        {/* Main Schedule Grid */}
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Hours Column */}
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

            {/* Employee Columns */}
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
                {/* Background Grid */}
                {Array.from({ length: TOTAL_HOURS * 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute left-0 right-0 border-b"
                    style={{ top: idx * 15 }}
                  />
                ))}

                {/* Now Line */}
                {nowPosition !== null && isSameDay(currentDate, new Date()) && (
                  <div
                    className="absolute left-0 right-0 h-[2px] bg-red-500 z-20"
                    style={{ top: nowPosition }}
                  />
                )}

                {/* Appointment Blocks */}
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

        {/* Appointment Details Dialog */}
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

        {/* Clicked Cell Popup */}
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

        {/* Add Appointment Slide-in */}
        <div
          className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
            isAddAppointmentOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
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
              {clickedCell && (
                <p className="text-sm text-muted-foreground mt-1">
                  {format(currentDate, "MMMM d, yyyy")} at{" "}
                  {formatTime(clickedCell.time)}
                </p>
              )}
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Customer Selection Panel - 40% */}
              <div className="w-[40%] border-r overflow-y-auto p-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Select Customer</h3>
                  {!selectedCustomer ? (
                    <CustomerSearch
                      onSelect={(customer) => {
                        setSelectedCustomer(customer);
                        setShowCreateForm(false);
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

              {/* Service Selection Panel - 60% */}
              <div className="w-[60%] overflow-y-auto p-6">
                <div className="space-y-6">
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
                  <div className="space-y-4">
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes for this appointment"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={closeAddAppointment}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveAppointment}>
                      Save Appointment
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
          paymentMethod={paymentMethod}
          onPaymentMethodChange={(value) => setPaymentMethod(value)}
          discountType={discountType}
          onDiscountTypeChange={(value) => setDiscountType(value)}
          discountValue={discountValue}
          onDiscountValueChange={setDiscountValue}
          totalPrice={getTotalPrice()}
          onSave={handleFinalSave}
          onCancel={() => setShowCheckout(false)}
        />
      </div>
    </DndProvider>
  );
}
