import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Check, ChevronsUpDown, Clock, User, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CustomerSearch } from "./CustomerSearch";
import { CreateClientDialog } from "./CreateClientDialog";
import { ServiceSelector } from "./ServiceSelector";
import { CheckoutSection } from "./CheckoutSection";
import { SummarySection } from "./SummarySection";
import { SCREEN, type Appointment, type Customer, type Employee } from "@/pages/admin/bookings/types";
import { useCart } from "@/components/cart/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/utils";

interface AppointmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  selectedTime: string;
  employees: Employee[];
  existingAppointment?: Appointment | null;
  locationId?: string;
}

export function AppointmentManager({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  employees,
  existingAppointment,
  locationId,
}: AppointmentManagerProps) {
  const [activeTab, setActiveTab] = React.useState(SCREEN.SERVICE_SELECTION);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [notes, setNotes] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [customizedServices, setCustomizedServices] = useState<Record<string, string[]>>({});
  const [activeCustomerMembership, setActiveCustomerMembership] = useState<any | null>(null);

  const { clearCart } = useCart();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('status', 'active')
          .order('name', { ascending: true });

        if (error) throw error;
        setServices(data || []);
      } catch (error) {
        console.error('Error fetching services:', error);
        toast.error('Failed to load services');
        setServices([]);
      }
    };

    const fetchPackages = async () => {
      try {
        const { data, error } = await supabase
          .from('packages')
          .select('*, package_services!inner(*, service:services(*))')
          .eq('status', 'active')
          .order('name', { ascending: true });

        if (error) throw error;
        setPackages(data || []);
      } catch (error) {
        console.error('Error fetching packages:', error);
        toast.error('Failed to load packages');
        setPackages([]);
      }
    };

    fetchServices();
    fetchPackages();
  }, []);

  useEffect(() => {
    if (existingAppointment) {
      setSelectedCustomer(existingAppointment.customer || null);
      setDiscountType(existingAppointment.discount_type);
      setDiscountValue(existingAppointment.discount_value);
      setPaymentMethod(existingAppointment.payment_method || 'cash');
      setNotes(existingAppointment.notes || '');

      // Load services and packages from existing appointment
      const existingServices = existingAppointment.bookings
        .filter(booking => booking.service_id)
        .map(booking => booking.service_id);
      setSelectedServices(existingServices);

      const existingPackages = existingAppointment.bookings
        .filter(booking => booking.package_id)
        .map(booking => booking.package_id);
      setSelectedPackages(existingPackages);

      // Load stylists and time slots from existing appointment
      const initialStylists = {};
      const initialTimeSlots = {};
      existingAppointment.bookings.forEach(booking => {
        if (booking.service_id) {
          initialStylists[booking.service_id] = booking.employee_id || '';
          initialTimeSlots[booking.service_id] = format(new Date(booking.start_time), 'HH:mm');
        } else if (booking.package_id) {
          initialStylists[booking.package_id] = booking.employee_id || '';
          initialTimeSlots[booking.package_id] = format(new Date(booking.start_time), 'HH:mm');
        }
      });
      setSelectedStylists(initialStylists);
      setSelectedTimeSlots(initialTimeSlots);
    } else {
      // Reset state when creating a new appointment
      setSelectedCustomer(null);
      setDiscountType('none');
      setDiscountValue(0);
      setPaymentMethod('cash');
      setNotes('');
      setSelectedServices([]);
      setSelectedPackages([]);
      setSelectedStylists({});
      setSelectedTimeSlots({});
      setCustomizedServices({});
    }
  }, [existingAppointment]);

  // Check for active memberships when customer is selected
  useEffect(() => {
    const fetchCustomerMemberships = async () => {
      if (!selectedCustomer) {
        setActiveCustomerMembership(null);
        return;
      }

      try {
        const today = new Date().toISOString();
        const { data, error } = await supabase
          .from('customer_memberships')
          .select(`
            *,
            membership:memberships(*)
          `)
          .eq('customer_id', selectedCustomer.id)
          .eq('status', 'active')
          .gte('end_date', today)
          .order('start_date', { ascending: false })
          .limit(1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setActiveCustomerMembership(data[0]);
        } else {
          setActiveCustomerMembership(null);
        }
      } catch (error) {
        console.error("Error fetching customer memberships:", error);
        setActiveCustomerMembership(null);
      }
    };

    fetchCustomerMemberships();
  }, [selectedCustomer]);

  // Apply membership discounts to services/packages
  useEffect(() => {
    if (!activeCustomerMembership || !selectedServices.length) {
      return;
    }

    const membership = activeCustomerMembership.membership;
    const applyToAll = membership.applicable_services.length === 0 && 
                       membership.applicable_packages.length === 0;
    
    // Check if we should apply membership discount
    const shouldApplyDiscount = (serviceId: string, packageId: string | null) => {
      if (applyToAll) return true;
      
      if (packageId && membership.applicable_packages.includes(packageId)) {
        return true;
      }
      
      if (serviceId && membership.applicable_services.includes(serviceId)) {
        return true;
      }
      
      return false;
    };
    
    // If we have an active membership with applicable discounts
    if (membership && (membership.discount_type === 'percentage' || membership.discount_type === 'fixed')) {
      // Check if the discount applies to any of our selected services
      let discountApplied = false;
      
      selectedServices.forEach(serviceId => {
        if (shouldApplyDiscount(serviceId, null)) {
          discountApplied = true;
        }
      });
      
      selectedPackages.forEach(packageId => {
        if (shouldApplyDiscount('', packageId)) {
          discountApplied = true;
        }
      });
      
      // If discount applies, set it automatically
      if (discountApplied) {
        setDiscountType(membership.discount_type === 'percentage' ? 'percentage' : 'fixed');
        setDiscountValue(membership.discount_value);
      }
    }
  }, [activeCustomerMembership, selectedServices, selectedPackages]);

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleTabChange = (tab: SCREEN) => {
    setActiveTab(tab);
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handlePackageToggle = (packageId: string) => {
    setSelectedPackages(prev =>
      prev.includes(packageId) ? prev.filter(id => id !== packageId) : [...prev, packageId]
    );
  };

  const handleStylistChange = (itemId: string, employeeId: string) => {
    setSelectedStylists(prev => ({ ...prev, [itemId]: employeeId }));
  };

  const handleTimeSlotChange = (itemId: string, time: string) => {
    setSelectedTimeSlots(prev => ({ ...prev, [itemId]: time }));
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(id => id !== serviceId));
    setSelectedStylists(prev => {
      const { [serviceId]: removed, ...rest } = prev;
      return rest;
    });
    setSelectedTimeSlots(prev => {
      const { [serviceId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const handleRemovePackage = (packageId: string) => {
    setSelectedPackages(prev => prev.filter(id => id !== packageId));
    setSelectedStylists(prev => {
      const { [packageId]: removed, ...rest } = prev;
      return rest;
    });
    setSelectedTimeSlots(prev => {
      const { [packageId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const handleSaveAppointment = async (params?: any): Promise<string | null> => {
    setIsSaving(true);
    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return null;
      }

      if (selectedServices.length === 0 && selectedPackages.length === 0) {
        toast.error("Please select at least one service or package");
        return null;
      }

      // Validate time slots and stylists
      for (const serviceId of selectedServices) {
        if (!selectedTimeSlots[serviceId]) {
          toast.error("Please select a time slot for each service");
          return null;
        }
        if (!selectedStylists[serviceId]) {
          toast.error("Please select a stylist for each service");
          return null;
        }
      }

      for (const packageId of selectedPackages) {
        if (!selectedTimeSlots[packageId]) {
          toast.error("Please select a time slot for each package");
          return null;
        }
        if (!selectedStylists[packageId]) {
          toast.error("Please select a stylist for each package");
          return null;
        }
      }

      // Calculate total price
      let totalPrice = 0;
      selectedServices.forEach(serviceId => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          totalPrice += service.selling_price;
        }
      });
      selectedPackages.forEach(packageId => {
        const pkg = packages.find(p => p.id === packageId);
        if (pkg) {
          totalPrice += pkg.price;
        }
      });

      // Create appointment data
      const appointmentData = {
        customer_id: selectedCustomer.id,
        start_time: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
        end_time: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
        status: 'confirmed',
        total_price: totalPrice,
        discount_type: discountType,
        discount_value: discountValue,
        payment_method: paymentMethod,
        notes: notes,
        location: locationId,
        original_appointment_id: existingAppointment ? existingAppointment.id : null,
        transaction_type: 'sale',
        ...params
      };

      // Save appointment to database
      let appointmentId;
      if (existingAppointment) {
        // Update existing appointment
        const { data, error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', existingAppointment.id)
          .select()
          .single();

        if (error) {
          console.error("Error updating appointment:", error);
          toast.error("Failed to update appointment");
          return null;
        }
        appointmentId = data.id;

        // Delete existing bookings and create new ones
        await supabase
          .from('bookings')
          .delete()
          .eq('appointment_id', existingAppointment.id);
      } else {
        // Create new appointment
        const { data, error } = await supabase
          .from('appointments')
          .insert([appointmentData])
          .select()
          .single();

        if (error) {
          console.error("Error creating appointment:", error);
          toast.error("Failed to create appointment");
          return null;
        }
        appointmentId = data.id;
      }

      // Create bookings for selected services and packages
      const bookings = [];
      for (const serviceId of selectedServices) {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          const startTime = new Date(selectedDate);
          const [hours, minutes] = selectedTimeSlots[serviceId].split(':').map(Number);
          startTime.setHours(hours, minutes, 0, 0);

          bookings.push({
            appointment_id: appointmentId,
            service_id: serviceId,
            employee_id: selectedStylists[serviceId],
            start_time: startTime.toISOString(),
            price_paid: service.selling_price,
            original_price: service.selling_price,
          });
        }
      }

      for (const packageId of selectedPackages) {
        const pkg = packages.find(p => p.id === packageId);
        if (pkg) {
          const startTime = new Date(selectedDate);
          const [hours, minutes] = selectedTimeSlots[packageId].split(':').map(Number);
          startTime.setHours(hours, minutes, 0, 0);

          bookings.push({
            appointment_id: appointmentId,
            package_id: packageId,
            employee_id: selectedStylists[packageId],
            start_time: startTime.toISOString(),
            price_paid: pkg.price,
            original_price: pkg.price,
          });
        }
      }

      const { error: bookingsError } = await supabase
        .from('bookings')
        .insert(bookings);

      if (bookingsError) {
        console.error("Error creating bookings:", bookingsError);
        toast.error("Failed to create bookings");
        return null;
      }

      // Clear cart and reset state
      clearCart();
      setShowSummary(true);
      return appointmentId;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteAppointment = async () => {
    const appointmentId = await handleSaveAppointment();
    if (appointmentId) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl p-0 h-[90vh]">
        <div className="h-full flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{existingAppointment ? "Edit Appointment" : "Add Appointment"}</DialogTitle>
            <DialogDescription>
              {existingAppointment
                ? "Update appointment details."
                : "Create a new appointment."}
            </DialogDescription>
            <Tabs
              defaultValue={SCREEN.SERVICE_SELECTION}
              value={activeTab}
              onValueChange={handleTabChange}
              className="mt-4"
            >
              <TabsList>
                <TabsTrigger value={SCREEN.SERVICE_SELECTION}>Services</TabsTrigger>
                <TabsTrigger value={SCREEN.CHECKOUT}>Checkout</TabsTrigger>
                <TabsTrigger value={SCREEN.SUMMARY}>Summary</TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value={SCREEN.SERVICE_SELECTION} className="h-full m-0">
              <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                <div className="md:col-span-1 border-r border-gray-200">
                  <SelectCustomer
                    selectedCustomer={selectedCustomer}
                    setSelectedCustomer={setSelectedCustomer}
                    setShowCreateForm={setShowCreateForm}
                  />
                  
                  {activeCustomerMembership && (
                    <div className="px-6 py-3 border-t border-gray-200">
                      <div className="bg-blue-50 rounded-md p-3 text-sm">
                        <div className="font-semibold text-blue-700 mb-1">
                          Active Membership
                        </div>
                        <div className="text-blue-800">
                          {activeCustomerMembership.membership.name}
                        </div>
                        <div className="text-blue-600 text-xs mt-1">
                          {activeCustomerMembership.membership.discount_type === 'percentage' 
                            ? `${activeCustomerMembership.membership.discount_value}% discount` 
                            : `${formatPrice(activeCustomerMembership.membership.discount_value)} discount`}
                          {activeCustomerMembership.membership.applicable_services.length === 0 && 
                           activeCustomerMembership.membership.applicable_packages.length === 0 
                            ? ' on all services' 
                            : ' on selected services'}
                        </div>
                        <div className="text-blue-600 text-xs mt-1">
                          Valid until: {format(new Date(activeCustomerMembership.end_date), 'PP')}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6 border-t">
                    <h3 className="text-lg font-semibold mb-4">
                      Select Service Time
                    </h3>
                    <div className="flex items-center space-x-4">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? (
                              format(selectedDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) =>
                              date < new Date()
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid w-full max-w-sm items-center gap-1.5 mt-4">
                      <Label htmlFor="time">Time</Label>
                      <Select
                        onValueChange={(value) => {
                          // Update time slot for all selected services
                          const updatedTimeSlots = {};
                          selectedServices.forEach(serviceId => {
                            updatedTimeSlots[serviceId] = value;
                          });
                          selectedPackages.forEach(packageId => {
                            updatedTimeSlots[packageId] = value;
                          });
                          setSelectedTimeSlots(updatedTimeSlots);
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="09:00">09:00 AM</SelectItem>
                          <SelectItem value="09:30">09:30 AM</SelectItem>
                          <SelectItem value="10:00">10:00 AM</SelectItem>
                          <SelectItem value="10:30">10:30 AM</SelectItem>
                          <SelectItem value="11:00">11:00 AM</SelectItem>
                          <SelectItem value="11:30">11:30 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM</SelectItem>
                          <SelectItem value="12:30">12:30 PM</SelectItem>
                          <SelectItem value="13:00">01:00 PM</SelectItem>
                          <SelectItem value="13:30">01:30 PM</SelectItem>
                          <SelectItem value="14:00">02:00 PM</SelectItem>
                          <SelectItem value="14:30">02:30 PM</SelectItem>
                          <SelectItem value="15:00">03:00 PM</SelectItem>
                          <SelectItem value="15:30">03:30 PM</SelectItem>
                          <SelectItem value="16:00">04:00 PM</SelectItem>
                          <SelectItem value="16:30">04:30 PM</SelectItem>
                          <SelectItem value="17:00">05:00 PM</SelectItem>
                          <SelectItem value="17:30">05:30 PM</SelectItem>
                          <SelectItem value="18:00">06:00 PM</SelectItem>
                          <SelectItem value="18:30">06:30 PM</SelectItem>
                          <SelectItem value="19:00">07:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 p-6">
                  <ServiceSelector
                    selectedServices={selectedServices}
                    selectedPackages={selectedPackages}
                    onServicesChange={handleServiceToggle}
                    onPackagesChange={handlePackageToggle}
                    employees={employees}
                    selectedStylists={selectedStylists}
                    onStylistChange={handleStylistChange}
                    selectedTimeSlots={selectedTimeSlots}
                    onTimeSlotChange={handleTimeSlotChange}
                    services={services}
                    packages={packages}
                    customizedServices={customizedServices}
                    setCustomizedServices={setCustomizedServices}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value={SCREEN.CHECKOUT} className="h-full m-0">
              <CheckoutSection
                appointmentId={existingAppointment?.id}
                selectedCustomer={selectedCustomer}
                selectedServices={selectedServices}
                selectedPackages={selectedPackages}
                services={services}
                packages={packages}
                discountType={discountType}
                discountValue={discountValue}
                paymentMethod={paymentMethod}
                notes={notes}
                onDiscountTypeChange={setDiscountType}
                onDiscountValueChange={setDiscountValue}
                onPaymentMethodChange={setPaymentMethod}
                onNotesChange={setNotes}
                onPaymentComplete={handleCompleteAppointment}
                selectedStylists={selectedStylists}
                selectedTimeSlots={selectedTimeSlots}
                onSaveAppointment={handleSaveAppointment}
                onRemoveService={handleRemoveService}
                onRemovePackage={handleRemovePackage}
                onBackToServices={() => setActiveTab(SCREEN.SERVICE_SELECTION)}
                isExistingAppointment={!!existingAppointment}
                customizedServices={customizedServices}
                locationId={locationId}
              />
            </TabsContent>
            
            <TabsContent value={SCREEN.SUMMARY} className="h-full m-0">
              <SummarySection
                selectedCustomer={selectedCustomer}
                selectedServices={selectedServices}
                selectedPackages={selectedPackages}
                services={services}
                packages={packages}
                discountType={discountType}
                discountValue={discountValue}
                paymentMethod={paymentMethod}
                notes={notes}
                selectedStylists={selectedStylists}
                selectedTimeSlots={selectedTimeSlots}
                selectedDate={selectedDate}
                existingAppointment={existingAppointment}
                customizedServices={customizedServices}
              />
            </TabsContent>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
