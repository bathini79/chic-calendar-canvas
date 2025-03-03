// src/pages/admin/AdminBookings.tsx
import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { CustomerFormDialog } from "./customers/components/CustomerFormDialog";
import { AppointmentFormDialog } from "./bookings/components/AppointmentFormDialog";
import { SCREEN, type Customer, type Appointment, type Service, type Package } from "./bookings/types";
import { useSaveAppointment } from "./bookings/hooks/useSaveAppointment";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";

const ITEMS_PER_PAGE = 10;

export default function AdminBookings() {
  const [date, setDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [notes, setNotes] = useState("");
  const [customizedServices, setCustomizedServices] = useState<Record<string, string[]>>({});
  const [appointmentDetailsOpen, setAppointmentDetailsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [appointmentFormOpen, setAppointmentFormOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<string>(SCREEN.SERVICE_SELECTION);
  const [page, setPage] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [sortColumn, setSortColumn] = useState<keyof Appointment | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
        .select(`
          *,
          package_services (
            service:services (
              id,
              name,
              selling_price,
              duration
            )
          )
        `)
        .eq("status", "active");
      if (error) {
        toast.error("Error loading packages");
        throw error;
      }
      return data;
    },
  });

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers", searchQuery],
    queryFn: async () => {
      let query = supabase.from("customers").select("*");
      if (searchQuery) {
        query = query.ilike("full_name", `%${searchQuery}%`);
      }
      const { data, error } = await query;
      if (error) {
        toast.error("Error loading customers");
        throw error;
      }
      return data;
    },
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments", date, page, sortColumn, sortDirection],
    queryFn: async () => {
      const startDate = startOfWeek(date, { weekStartsOn: 1 });
      const endDate = endOfWeek(date, { weekStartsOn: 1 });

      let query = supabase
        .from("appointments")
        .select(
          `
          *,
          customer:customers(*)
        `,
          { count: "exact" }
        )
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === "asc" });
      }

      const { data, error, count } = await query;

      if (error) {
        toast.error("Error loading appointments");
        throw error;
      }

      setTotalAppointments(count || 0);
      return data;
    },
  });

  const getTotalPrice = useCallback(
    (
      selectedServices: string[],
      selectedPackages: string[],
      services: Service[],
      packages: Package[],
      customizedServices?: Record<string, string[]>
    ) => {
      let total = 0;

      // Calculate price for individual services
      selectedServices.forEach((serviceId) => {
        const service = services?.find((s) => s.id === serviceId);
        if (service) {
          total += service.selling_price;
        }
      });

      // Calculate price for packages including customizations
      selectedPackages.forEach((packageId) => {
        const pkg = packages?.find((p) => p.id === packageId);
        if (pkg) {
          total += pkg.price; // Add base package price

          // Add price for additional customized services
          if (pkg.is_customizable && customizedServices && customizedServices[packageId]) {
            customizedServices[packageId].forEach((serviceId) => {
              const service = services?.find((s) => s.id === serviceId);
              if (service && !pkg.package_services?.some(ps => ps.service.id === serviceId)) {
                total += service.selling_price;
              }
            });
          }
        }
      });

      return total;
    },
    []
  );

  const getTotalDuration = useCallback(
    (
      selectedServices: string[],
      selectedPackages: string[],
      services: Service[],
      packages: Package[],
      customizedServices?: Record<string, string[]>
    ) => {
      let totalDuration = 0;

      // Calculate duration for individual services
      selectedServices.forEach((serviceId) => {
        const service = services?.find((s) => s.id === serviceId);
        if (service) {
          totalDuration += service.duration;
        }
      });

      // Calculate duration for packages including customizations
      selectedPackages.forEach((packageId) => {
        const pkg = packages?.find((p) => p.id === packageId);
        if (pkg) {
          // Add durations of all included services
          pkg.package_services?.forEach((ps) => {
            totalDuration += ps.service.duration;
          });

          // Add duration for additional customized services
          if (pkg.is_customizable && customizedServices && customizedServices[packageId]) {
            customizedServices[packageId].forEach((serviceId) => {
              const service = services?.find((s) => s.id === serviceId);
              if (service && !pkg.package_services?.some(ps => ps.service.id === serviceId)) {
                totalDuration += service.duration;
              }
            });
          }
        }
      });

      return totalDuration;
    },
    []
  );

  const { handleSaveAppointment, isSaving } = useSaveAppointment({
    selectedDate: date,
    selectedTime: selectedTime,
    selectedCustomer: selectedCustomer,
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

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleServiceSelect = (serviceId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedServices((prev) => [...prev, serviceId]);
    } else {
      setSelectedServices((prev) => prev.filter((id) => id !== serviceId));
    }
  };

  const handlePackageSelect = (packageId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPackages((prev) => [...prev, packageId]);
    } else {
      setSelectedPackages((prev) => prev.filter((id) => id !== packageId));
    }
  };

  const handleStylistSelect = (serviceId: string, stylistId: string) => {
    setSelectedStylists((prev) => ({ ...prev, [serviceId]: stylistId }));
  };

  const handleDiscountTypeChange = (type: string) => {
    // When setting payment method from string to enum
    setPaymentMethod(paymentMethod);

    // When setting discount type from string to enum  
    setDiscountType(type as "fixed" | "none" | "percentage");
  };

  const handleDiscountValueChange = (value: number) => {
    setDiscountValue(value);
  };

  const handlePaymentMethodChange = (method: string) => {
    // When setting payment method from string to enum
    setPaymentMethod(method as "cash" | "online");
  };

  const handleNotesChange = (notes: string) => {
    setNotes(notes);
  };

  const handleCustomizedServicesChange = (packageId: string, serviceIds: string[]) => {
    setCustomizedServices((prev) => ({ ...prev, [packageId]: serviceIds }));
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentDetailsOpen(true);
  };

  const handleAppointmentUpdated = () => {
    // Refresh appointments data
  };

  const handleCreateCustomerClick = () => {
    setCustomerFormOpen(true);
  };

  const handleEditAppointmentClick = () => {
    if (selectedAppointment) {
      // Populate state with appointment details for editing
      setSelectedCustomer(selectedAppointment.customer || null);
      setDate(new Date(selectedAppointment.start_time));
      setSelectedTime(format(new Date(selectedAppointment.start_time), "HH:mm"));
      setSelectedServices([]);
      setSelectedPackages([]);
      setSelectedStylists({});
      setDiscountType(selectedAppointment.discount_type as "none" | "percentage" | "fixed");
      setDiscountValue(selectedAppointment.discount_value);
      setPaymentMethod(selectedAppointment.payment_method as "cash" | "online");
      setNotes(selectedAppointment.notes || "");
      setCustomizedServices({});

      // Open the appointment form
      setAppointmentFormOpen(true);
      setAppointmentDetailsOpen(false);
    }
  };

  const handleCheckoutAppointment = (appointment: Appointment) => {
    if (appointment) {
      // Populate state with appointment details for editing
      setSelectedCustomer(appointment.customer || null);
      setDate(new Date(appointment.start_time));
      setSelectedTime(format(new Date(appointment.start_time), "HH:mm"));
      setSelectedServices([]);
      setSelectedPackages([]);
      setSelectedStylists({});
      setDiscountType(appointment.discount_type as "none" | "percentage" | "fixed");
      setDiscountValue(appointment.discount_value);
      setPaymentMethod(appointment.payment_method as "cash" | "online");
      setNotes(appointment.notes || "");
      setCustomizedServices({});
      setCurrentScreen(SCREEN.CHECKOUT);

      // Open the appointment form
      setAppointmentFormOpen(true);
      setAppointmentDetailsOpen(false);
    }
  };

  const handleCreateAppointmentClick = () => {
    // Reset state
    setSelectedCustomer(null);
    setDate(new Date());
    setSelectedTime(null);
    setSelectedServices([]);
    setSelectedPackages([]);
    setSelectedStylists({});
    setDiscountType("none");
    setDiscountValue(0);
    setPaymentMethod("cash");
    setNotes("");
    setCustomizedServices({});
    setCurrentScreen(SCREEN.SERVICE_SELECTION);

    // Open the appointment form
    setAppointmentFormOpen(true);
  };

  const handleSave = async () => {
    const appointmentId = await handleSaveAppointment();
    if (appointmentId) {
      toast.success("Appointment saved successfully!");
      setAppointmentFormOpen(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSort = (column: keyof Appointment) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 hover:bg-green-200 border-green-300";
      case "canceled":
        return "bg-red-100 hover:bg-red-200 border-red-300";
      default:
        return "bg-purple-100 hover:bg-purple-200 border-purple-300";
    }
  };

  const customerInitials = (customer: Customer) => {
    return customer.full_name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  const getFormattedDate = (date: Date) => {
    return format(date, "EEE dd MMM");
  };

  const getFormattedTime = (date: Date) => {
    return format(date, "h:mm a");
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    handleServiceSelect(serviceId, checked);
  };

  const handlePackageToggle = (packageId: string, checked: boolean) => {
    handlePackageSelect(packageId, checked);
  };

  const handleStylistSelection = (serviceId: string, stylistId: string) => {
    handleStylistSelect(serviceId, stylistId);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Manage Appointments</h1>
        <Button onClick={handleCreateAppointmentClick}>
          <Plus className="h-4 w-4 mr-2" />
          Create Appointment
        </Button>
      </div>

      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <Label htmlFor="date">Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={
                    "w-full justify-start text-left font-normal" +
                    (date ? " pl-3" : " text-muted-foreground")
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? getFormattedDate(date) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  disabled={(date) =>
                    date > addDays(new Date(), 30) || date < subDays(new Date(), 0)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="md:col-span-1">
            <Label htmlFor="customer">Find Customer</Label>
            <Input
              type="text"
              id="customer"
              placeholder="Search customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="md:col-span-1">
            <Label htmlFor="newCustomer">&nbsp;</Label>
            <Button variant="secondary" className="w-full" onClick={handleCreateCustomerClick}>
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <Table>
          <TableCaption>A list of your recent appointments.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
                <Button variant="link" onClick={() => handleSort("start_time")}>
                  Date
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="link" onClick={() => handleSort("customer_id")}>
                  Customer
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="link" onClick={() => handleSort("number_of_bookings")}>
                  # Services
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="link" onClick={() => handleSort("total_price")}>
                  Total Price
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="link" onClick={() => handleSort("status")}>
                  Status
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointmentsLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading appointments...
                </TableCell>
              </TableRow>
            ) : appointments && appointments.length > 0 ? (
              appointments.map((appointment) => (
                <TableRow key={appointment.id} onClick={() => handleAppointmentClick(appointment)}>
                  <TableCell className="font-medium">
                    {getFormattedDate(new Date(appointment.start_time))}
                    <br />
                    <Badge variant="secondary">{getFormattedTime(new Date(appointment.start_time))}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{customerInitials(appointment.customer)}</AvatarFallback>
                      </Avatar>
                      <span>{appointment.customer.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{appointment.number_of_bookings}</TableCell>
                  <TableCell>₹{appointment.total_price}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No appointments found for the selected date.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total {totalAppointments} Appointments
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page * ITEMS_PER_PAGE >= totalAppointments}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={appointmentDetailsOpen}
        onOpenChange={setAppointmentDetailsOpen}
        onEdit={handleEditAppointmentClick}
        onUpdated={handleAppointmentUpdated}
        onCheckout={handleCheckoutAppointment}
      />

      <CustomerFormDialog
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
      />

      <AppointmentFormDialog
        open={appointmentFormOpen}
        onOpenChange={setAppointmentFormOpen}
        selectedDate={date}
        selectedTime={selectedTime}
        selectedCustomer={selectedCustomer}
        selectedServices={selectedServices}
        selectedPackages={selectedPackages}
        services={services || []}
        packages={packages || []}
        selectedStylists={selectedStylists}
        discountType={discountType}
        discountValue={discountValue}
        paymentMethod={paymentMethod}
        notes={notes}
        customizedServices={customizedServices}
        customers={customers || []}
        customersLoading={customersLoading}
        onDateSelect={handleDateSelect}
        onTimeSelect={handleTimeSelect}
        onCustomerSelect={handleCustomerSelect}
        onServiceToggle={handleServiceToggle}
        onPackageToggle={handlePackageToggle}
        onStylistSelect={handleStylistSelection}
        onDiscountTypeChange={handleDiscountTypeChange}
        onDiscountValueChange={handleDiscountValueChange}
        onPaymentMethodChange={handlePaymentMethodChange}
        onNotesChange={handleNotesChange}
        onCustomizedServicesChange={handleCustomizedServicesChange}
        onCreateCustomerClick={handleCreateCustomerClick}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
