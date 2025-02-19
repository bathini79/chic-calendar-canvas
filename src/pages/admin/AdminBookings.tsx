
import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { CustomerSearch } from "./bookings/components/CustomerSearch";
import { ServiceSelector } from "./bookings/components/ServiceSelector";
import { PaymentSection } from "./bookings/components/PaymentSection";
import { useAppointmentHandlers } from "./bookings/hooks/useAppointmentHandlers";
import type { Customer, Employee } from "./bookings/types";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats] = useState(initialStats);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [nowPosition, setNowPosition] = useState<number | null>(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  const {
    paymentMethod,
    discountType,
    discountValue,
    appointmentNotes,
    paymentCompleted,
    setPaymentMethod,
    setDiscountType,
    setDiscountValue,
    setAppointmentNotes,
    handleSaveAppointment,
    handleCheckoutSave,
  } = useAppointmentHandlers();

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

  const closeAddAppointment = () => {
    setIsAddAppointmentOpen(false);
    setSelectedCustomer(null);
    setSelectedServices([]);
    setSelectedPackages([]);
    setSelectedStylists({});
    setShowPaymentSection(false);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
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

            {employees.map((emp) => (
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
                        <Button
                          onClick={() =>
                            handleSaveAppointment({
                              selectedDate,
                              selectedTime,
                              selectedCustomer,
                              selectedServices,
                              selectedStylists,
                              services,
                              getTotalDuration,
                              getTotalPrice,
                            }).then((appointmentId) => {
                              if (appointmentId) {
                                setShowPaymentSection(true);
                              }
                            })
                          }
                        >
                          Save & Proceed to Payment
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full p-6 overflow-y-auto">
                  <PaymentSection
                    paymentCompleted={paymentCompleted}
                    selectedServices={selectedServices}
                    services={services || []}
                    employees={employees}
                    selectedStylists={selectedStylists}
                    selectedCustomer={selectedCustomer}
                    paymentMethod={paymentMethod}
                    discountType={discountType}
                    discountValue={discountValue}
                    appointmentNotes={appointmentNotes}
                    getTotalPrice={getTotalPrice}
                    getFinalPrice={getFinalPrice}
                    onPaymentMethodChange={setPaymentMethod}
                    onDiscountTypeChange={setDiscountType}
                    onDiscountValueChange={setDiscountValue}
                    onNotesChange={setAppointmentNotes}
                    onBack={() => setShowPaymentSection(false)}
                    onSave={() => handleCheckoutSave(getFinalPrice)}
                    onClose={closeAddAppointment}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
