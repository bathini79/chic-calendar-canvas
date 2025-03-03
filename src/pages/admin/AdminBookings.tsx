import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CustomerTable } from "./components/CustomerTable";
import { AppointmentDetailsDialog } from "./components/AppointmentDetailsDialog";
import { SummaryView } from "./components/SummaryView";
import { useNavigate } from "react-router-dom";
import { SCREEN } from "./bookings/types";
import { getTotalPrice, getTotalDuration } from "./bookings/utils/bookingUtils";
import useSaveAppointment from "./bookings/hooks/useSaveAppointment";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";

export default function AdminBookings() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [notes, setNotes] = useState("");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [customizedServices, setCustomizedServices] = useState<Record<string, string[]>>({});
  const [currentScreen, setCurrentScreen] = useState<string>(SCREEN.SERVICE_SELECTION);

  const navigate = useNavigate();

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("status", "active");
      if (error) {
        toast.error("Error loading services");
        throw error;
      }
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
      if (error) {
        toast.error("Error loading packages");
        throw error;
      }
      return data;
    },
  });

  const getTotal = () => {
    return getTotalPrice(
      selectedServices,
      selectedPackages,
      services || [],
      packages || [],
      customizedServices
    );
  };

  const { handleSaveAppointment, isSaving } = useSaveAppointment({
    selectedDate: date,
    selectedTime: time,
    selectedCustomer: customer,
    selectedServices: selectedServices,
    selectedPackages: selectedPackages,
    services: services,
    packages: packages,
    selectedStylists: selectedStylists,
    getTotalDuration: getTotalDuration,
    getTotalPrice: getTotalPrice,
    discountType: discountType,
    discountValue: discountValue,
    paymentMethod: paymentMethod,
    notes: notes,
    customizedServices: customizedServices,
    currentScreen: currentScreen
  });

  const cartItems = [
    ...(selectedServices.map((serviceId) => {
      const service = services?.find((s) => s.id === serviceId);
      return {
        id: serviceId,
        service_id: serviceId,
        service: service,
        selling_price: service?.selling_price || 0,
      };
    }) || []),
    ...(selectedPackages.map((packageId) => {
      const pkg = packages?.find((p) => p.id === packageId);
      return {
        id: packageId,
        package_id: packageId,
        package: pkg,
        customized_services: customizedServices[packageId],
        selling_price: pkg?.price || 0,
      };
    }) || []),
  ];

  const handleStylistSelect = (serviceId: string, stylistId: string) => {
    setSelectedStylists((prev) => ({ ...prev, [serviceId]: stylistId }));
  };

  const handleCreateAppointment = async () => {
    const appointmentId = await handleSaveAppointment();
    if (appointmentId) {
      setAppointmentId(appointmentId);
      setIsAppointmentDialogOpen(true);
    }
  };

  const handleEditAppointment = () => {
    setIsAppointmentDialogOpen(false);
    toast.success("Successfully updated appointment");
  };

  const handleCheckout = (appointment: any) => {
    setAppointmentId(appointment.id);
    setCurrentScreen(SCREEN.CHECKOUT);
  };

  useEffect(() => {
    if (currentScreen === SCREEN.CHECKOUT) {
      handleCreateAppointment();
    }
  }, [currentScreen]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5">Create Appointment</h1>

      {/* Date and Time Selection */}
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) =>
                date < new Date() || date > new Date(new Date().setDate(new Date().getDate() + 30))
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="flex-1">
          <Label htmlFor="time">Select Time</Label>
          <Input
            type="time"
            id="time"
            value={time || ""}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      {/* Customer Selection */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <Label>Select Customer</Label>
          <Button onClick={() => setIsCustomerDialogOpen(true)}>
            {customer ? "Change Customer" : "Select Customer"}
          </Button>
        </div>
        {customer && (
          <div className="p-4 bg-gray-100 rounded-md">
            <h3 className="font-semibold">{customer.full_name}</h3>
            <p>Email: {customer.email}</p>
            <p>Phone: {customer.phone_number || "N/A"}</p>
          </div>
        )}
      </div>

      {/* Service and Package Selection */}
      <div className="mb-5">
        <ServiceSelector
          items={cartItems}
          selectedStylists={selectedStylists}
          onStylistSelect={handleStylistSelect}
        />
      </div>

      {/* Discount and Payment */}
      <div className="mb-5">
        <h2 className="text-xl font-semibold mb-3">Discount & Payment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discountType">Discount Type</Label>
            <select
              id="discountType"
              className="w-full p-2 border rounded-md"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "none" | "percentage" | "fixed")}
            >
              <option value="none">No Discount</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <div>
            <Label htmlFor="discountValue">Discount Value</Label>
            <Input
              type="number"
              id="discountValue"
              className="w-full"
              value={discountValue.toString()}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              disabled={discountType === "none"}
            />
          </div>
          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <select
              id="paymentMethod"
              className="w-full p-2 border rounded-md"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'online')}
            >
              <option value="cash">Cash</option>
              <option value="online">Online</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          className="w-full p-2 border rounded-md"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        ></textarea>
      </div>

      {/* Total and Submit */}
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">Total: ₹{getTotal()}</div>
        <Button
          onClick={handleCreateAppointment}
          disabled={!date || !time || !customer || isSaving}
        >
          {isSaving ? "Creating..." : "Create Appointment"}
        </Button>
      </div>

      {/* Customer Dialog */}
      <CustomerTable
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        onSelect={setCustomer}
      />

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointment={
          appointmentId
            ? {
                id: appointmentId,
                customer_id: customer?.id,
                customer: customer,
                status: "confirmed",
                start_time: date?.toISOString() || "",
                end_time: date?.toISOString() || "",
                total_price: getTotal(),
                payment_method: paymentMethod,
                discount_type: discountType,
                discount_value: discountValue,
                bookings: [],
                number_of_bookings: 0,
                total_duration: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : null
        }
        open={isAppointmentDialogOpen}
        onOpenChange={setIsAppointmentDialogOpen}
        onEdit={handleEditAppointment}
        onCheckout={handleCheckout}
        onUpdated={() => {}}
      />
    </div>
  );
}
