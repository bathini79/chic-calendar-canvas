
import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { CustomerSearch } from "./bookings/components/CustomerSearch";
import { ServiceSelector } from "./bookings/components/ServiceSelector";
import { CalendarIcon } from "./bookings/components/Icons";
import type { Customer } from "./bookings/types";
import { Button } from "@/components/ui/button";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
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

const initialStats = [
  { label: "Pending Confirmation", value: 0 },
  { label: "Upcoming Bookings", value: 11 },
  { label: "Today's Bookings", value: 5 },
  { label: "Today's Revenue", value: 1950 },
];

export default function AdminBookings() {
  const [employees, setEmployees] = useState([]);
  const [stats] = useState(initialStats);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [nowPosition, setNowPosition] = useState<number | null>(null);
  const [clickedCell, setClickedCell] = useState<{
    employeeId: number;
    time: number;
    x: number;
    y: number;
    date?: Date;
  } | null>(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [appointmentNotes, setAppointmentNotes] = useState("");

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

  const getTotalPrice = () => {
    let total = 0;

    selectedServices.forEach((serviceId) => {
      const service = services?.find((s) => s.id === serviceId);
      if (service) {
        total += service.selling_price;
      }
    });

    selectedPackages.forEach((packageId) => {
      const pkg = services?.find((p) => p.id === packageId);
      if (pkg) {
        total += pkg.selling_price;
      }
    });

    return total;
  };

  const getFinalPrice = () => {
    const total = getTotalPrice();
    if (discountType === 'percentage') {
      return total * (1 - (discountValue / 100));
    }
    return Math.max(0, total - discountValue);
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
      const pkg = services?.find((p) => p.id === packageId);
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
      const totalPrice = getTotalPrice();

      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          customer_id: selectedCustomer.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'confirmed',
          number_of_bookings: selectedServices.length + selectedPackages.length,
          total_price: totalPrice,
          original_total_price: totalPrice,
          total_duration: totalDuration
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      const appointmentId = appointmentData.id;
      setCurrentAppointmentId(appointmentId);

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
      handleProceedToCheckout();
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
    }
  };

  const handleProceedToCheckout = () => {
    if (!currentAppointmentId) {
      toast.error("No appointment found. Please save the appointment first.");
      return;
    }
    setShowPaymentSection(true);
  };

  const handleCheckoutSave = async () => {
    if (!currentAppointmentId) {
      toast.error("No appointment found");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          payment_method: paymentMethod,
          discount_type: discountType,
          discount_value: discountValue,
          notes: appointmentNotes,
          total_price: getFinalPrice()
        })
        .eq('id', currentAppointmentId);

      if (updateError) throw updateError;

      toast.success("Payment completed successfully");
      setPaymentCompleted(true);
    } catch (error: any) {
      console.error("Error completing payment:", error);
      toast.error(error.message || "Failed to complete payment");
    }
  };

  const closeAddAppointment = () => {
    setIsAddAppointmentOpen(false);
    setSelectedCustomer(null);
    setSelectedServices([]);
    setSelectedPackages([]);
    setSelectedStylists({});
    setShowPaymentSection(false);
    setPaymentCompleted(false);
    setCurrentAppointmentId(null);
    setPaymentMethod('cash');
    setDiscountType('none');
    setDiscountValue(0);
    setAppointmentNotes('');
  };

  const onPaymentMethodChange = (value: 'cash' | 'online') => {
    setPaymentMethod(value);
  };

  const onDiscountTypeChange = (value: 'none' | 'percentage' | 'fixed') => {
    setDiscountType(value);
    setDiscountValue(0);
  };

  const onDiscountValueChange = (value: number) => {
    setDiscountValue(value);
  };

  const onNotesChange = (value: string) => {
    setAppointmentNotes(value);
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

        <div className="flex-1 overflow-auto">
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
              >
                {Array.from({ length: TOTAL_HOURS * 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute left-0 right-0 border-b"
                    style={{ top: idx * 15 }}
                  />
                ))}

                {nowPosition !== null && (
                  <div
                    className="absolute left-0 right-0 h-[2px] bg-red-500 z-20"
                    style={{ top: nowPosition }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

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
            </div>

            <div className="flex-1 flex overflow-hidden">
              {!showPaymentSection ? (
                <>
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
                        <Button onClick={handleSaveAppointment}>
                          Save Appointment
                        </Button>
                        <Button onClick={handleProceedToCheckout}>
                          Proceed to Checkout
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full p-6 overflow-y-auto">
                  {!paymentCompleted ? (
                    <div className="space-y-8">
                      <div className="border rounded-lg p-6">
                        <h3 className="text-xl font-semibold mb-4">Selected Services</h3>
                        <div className="space-y-4">
                          {selectedServices.map((serviceId) => {
                            const service = services?.find((s) => s.id === serviceId);
                            const stylist = employees.find((e: any) => e.id === selectedStylists[serviceId]);
                            return (
                              <div key={serviceId} className="flex justify-between items-start border-b pb-4">
                                <div>
                                  <p className="font-medium">{service?.name}</p>
                                  <p className="text-sm text-gray-600">Stylist: {stylist?.name}</p>
                                </div>
                                <p className="font-medium">₹{service?.selling_price}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border rounded-lg p-6 space-y-4">
                        <h3 className="text-xl font-semibold mb-4">Payment Details</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Payment Method</label>
                            <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
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
                            <Select value={discountType} onValueChange={onDiscountTypeChange}>
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
                                onChange={(e) => onDiscountValueChange(Number(e.target.value))}
                                min={0}
                                max={discountType === 'percentage' ? 100 : undefined}
                              />
                            </div>
                          )}

                          <div>
                            <label className="text-sm font-medium">Notes</label>
                            <Textarea
                              value={appointmentNotes}
                              onChange={(e) => onNotesChange(e.target.value)}
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
                            <span>₹{getFinalPrice()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowPaymentSection(false)}>
                          Back
                        </Button>
                        <Button onClick={handleCheckoutSave}>
                          Make Payment
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="text-green-600 text-2xl font-medium">
                        Payment Completed Successfully!
                      </div>
                      <div className="max-w-md mx-auto p-6 border rounded-lg">
                        <h3 className="text-lg font-medium mb-4">Transaction Summary</h3>
                        <div className="space-y-2 text-left">
                          <p><span className="font-medium">Customer:</span> {selectedCustomer?.full_name}</p>
                          <p><span className="font-medium">Payment Method:</span> {paymentMethod}</p>
                          <p><span className="font-medium">Amount Paid:</span> ₹{getFinalPrice()}</p>
                          <p><span className="font-medium">Status:</span> Completed</p>
                        </div>
                      </div>
                      <Button onClick={closeAddAppointment}>
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
