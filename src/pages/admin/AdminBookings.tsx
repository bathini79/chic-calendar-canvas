import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { CustomerSearch } from "./bookings/components/CustomerSearch";
import { ServiceSelector } from "./bookings/components/ServiceSelector";
import { CalendarIcon, ArrowLeftIcon, ArrowRightIcon } from "./bookings/components/Icons";
import type { Customer } from "./bookings/types";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { addMinutes } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const START_HOUR = 8; // 8:00 AM
const END_HOUR = 20; // 8:00 PM
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
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);

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

  const handleProceedToCheckout = async () => {
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

      if (appointmentError) throw appointmentError;

      const appointmentId = appointmentData[0].id;

      for (const serviceId of selectedServices) {
        const service = services?.find(s => s.id === serviceId);
        if (!service) continue;

        const bookingStartTime = startDateTime;
        const bookingEndTime = addMinutes(startDateTime, service.duration);

        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            appointment_id: appointmentId,
            service_id: serviceId,
            employee_id: selectedStylists[serviceId],
            start_time: bookingStartTime.toISOString(),
            end_time: bookingEndTime.toISOString(),
            price_paid: service.selling_price,
            status: 'confirmed'
          });

        if (bookingError) throw bookingError;
      }

      toast.success("Appointment saved successfully");
      setShowPaymentSection(true);
      setIsAddAppointmentOpen(false);
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
    }
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
          onToday={() => setCurrentDate(new Date())}
          onPrevious={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() - 1);
            setCurrentDate(newDate);
          }}
          onNext={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + 1);
            setCurrentDate(newDate);
          }}
        />

        {showPaymentSection ? (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h2 className="text-2xl font-semibold">Payment Details</h2>
                  <p className="text-gray-600">Complete payment for the appointment</p>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Payment Method</label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Discount Type</label>
                      <Select value={discountType} onValueChange={setDiscountType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select discount type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    {discountType !== 'none' && (
                      <div>
                        <label className="text-sm font-medium">
                          {discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount (₹)'}
                        </label>
                        <Input
                          type="number"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Number(e.target.value))}
                          min={0}
                          max={discountType === 'percentage' ? 100 : undefined}
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes for this appointment"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Original Price:</span>
                      <span>₹{getTotalPrice()}</span>
                    </div>
                    {discountType !== 'none' && discountValue > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="font-medium">Discount:</span>
                        <span>
                          {discountType === 'percentage' 
                            ? `${discountValue}%`
                            : `₹${discountValue}`
                          }
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-bold text-xl mt-2">
                      <span>Final Price:</span>
                      <span>₹{getTotalPrice() - discountValue}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowPaymentSection(false)}>
                    Back
                  </Button>
                  <Button onClick={() => handleCheckoutSave(getTotalPrice() - discountValue)}>
                    Make Payment
                  </Button>
                </div>
              </div>
            </div>
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

                  {nowPosition !== null && isSameDay(currentDate, new Date()) && (
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

        {/* Appointment Form Slide-in */}
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
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={closeAddAppointment}>
                      Cancel
                    </Button>
                    <Button onClick={handleProceedToCheckout}>
                      Save & Proceed to Checkout
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
