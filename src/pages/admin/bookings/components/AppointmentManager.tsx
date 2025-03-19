import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, CheckCheck, DollarSign, User, Clock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";

import { ServiceSelector } from './ServiceSelector';
import { CheckoutSection } from './CheckoutSection';
import { AppointmentSummary } from './AppointmentSummary';
import { CustomerSearch } from './CustomerSearch';
import { SCREEN, AppointmentStatus, Service, Package, Customer, Employee } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { cn, formatPrice } from '@/lib/utils';

interface AppointmentManagerProps {
  locationId?: string;
}

export const AppointmentManager: React.FC<AppointmentManagerProps> = ({ locationId }) => {
  const [screen, setScreen] = useState<SCREEN>(SCREEN.SERVICE_SELECTION);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<"none" | "fixed" | "percentage">("none");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<string>("10:00");
  const [notes, setNotes] = useState<string>("");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Record<string, { id: string; name: string }>>({});
  const navigate = useNavigate();
  const { id: appointmentIdParam } = useParams<{ id: string }>();

  // Fetch appointment details if appointmentId is available
  const { data: appointmentData, isLoading: isAppointmentLoading } = useQuery(
    ['appointment', appointmentIdParam],
    async () => {
      if (!appointmentIdParam) return null;

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          bookings(
            service_id,
            employee_id
          ),
          customer(*)
        `)
        .eq('id', appointmentIdParam)
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    {
      enabled: !!appointmentIdParam,
    }
  );

  useEffect(() => {
    if (appointmentData) {
      setAppointmentId(appointmentData.id);
      setSelectedCustomer(appointmentData.customer as Customer);
      setStartDate(new Date(appointmentData.start_time));
      setStartTime(format(new Date(appointmentData.start_time), 'HH:mm'));
      setDiscountType(appointmentData.discount_type as "none" | "fixed" | "percentage");
      setDiscountValue(appointmentData.discount_value);
      setPaymentMethod(appointmentData.payment_method as "cash" | "online");
      setNotes(appointmentData.notes || "");

      // Extract service IDs and employee IDs from bookings
      const serviceIds: string[] = [];
      const employeeMap: Record<string, { id: string; name: string }> = {};

      appointmentData.bookings.forEach((booking: any) => {
        if (booking.service_id) {
          serviceIds.push(booking.service_id);
          employeeMap[booking.service_id] = { id: booking.employee_id, name: booking.employee_id }; // You might need to fetch employee name
        }
      });

      setSelectedServices(serviceIds);
      setSelectedEmployees(employeeMap);
    }
  }, [appointmentData]);

  // Fetch available services
  const { data: availableServices = [], isLoading: isServicesLoading } = useQuery({
    queryKey: ['services', locationId],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('*')
        .eq('status', 'active');
      
      if (locationId) {
        // Get services associated with this location
        const { data: serviceLocations, error: serviceLocationsError } = await supabase
          .from('service_locations')
          .select('service_id')
          .eq('location_id', locationId);
        
        if (serviceLocationsError) throw serviceLocationsError;
        
        // If we have service locations, filter by them
        if (serviceLocations && serviceLocations.length > 0) {
          const serviceIds = serviceLocations.map(sl => sl.service_id);
          query = query.in('id', serviceIds);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch available packages
  const { data: availablePackages = [], isLoading: isPackagesLoading } = useQuery({
    queryKey: ['packages', locationId],
    queryFn: async () => {
      let query = supabase
        .from('packages')
        .select(`
          *,
          package_services(
            service:services(*)
          )
        `)
        .eq('status', 'active');
      
      if (locationId) {
        // Get packages associated with this location
        const { data: packageLocations, error: packageLocationsError } = await supabase
          .from('package_locations')
          .select('package_id')
          .eq('location_id', locationId);
        
        if (packageLocationsError) throw packageLocationsError;
        
        // If we have package locations, filter by them
        if (packageLocations && packageLocations.length > 0) {
          const packageIds = packageLocations.map(pl => pl.package_id);
          query = query.in('id', packageIds);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch available stylists
  const { data: availableStylists = [], isLoading: isStylistsLoading } = useQuery({
    queryKey: ['stylists', locationId],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select('*')
        .eq('employment_type', 'stylist')
        .eq('status', 'active');
      
      if (locationId) {
        // Get stylists associated with this location
        const { data: employeeLocations, error: employeeLocationsError } = await supabase
          .from('employee_locations')
          .select('employee_id')
          .eq('location_id', locationId);
        
        if (employeeLocationsError) throw employeeLocationsError;
        
        // If we have employee locations, filter by them
        if (employeeLocations && employeeLocations.length > 0) {
          const employeeIds = employeeLocations.map(el => el.employee_id);
          query = query.in('id', employeeIds);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handlePackageSelect = (packageId: string, serviceIds?: string[]) => {
    setSelectedPackages((prev) => {
      if (prev.includes(packageId)) {
        return prev.filter((id) => id !== packageId);
      } else {
        return [...prev, packageId];
      }
    });
  };

  const handleStylistSelect = (itemId: string, stylistId: string) => {
    setSelectedEmployees((prev) => ({
      ...prev,
      [itemId]: { id: stylistId, name: stylistId }, // Replace name with actual stylist name if available
    }));
  };

  const handleConfirmCheckout = (appointment: any) => {
    // Handle successful checkout, e.g., navigate to a confirmation page
    navigate('/admin/bookings');
  };

  const handleCancelCheckout = () => {
    // Handle cancellation, e.g., go back to service selection
    setScreen(SCREEN.SERVICE_SELECTION);
  };

  return (
    <div className="container max-w-5xl mx-auto py-10 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {appointmentId ? 'Edit Appointment' : 'Create Appointment'}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>Customer</Label>
            {selectedCustomer ? (
              <div className="flex items-center space-x-4">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{selectedCustomer?.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer?.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <CustomerSearch onSelect={setSelectedCustomer} />
            )}
          </div>

          <Separator />

          {/* Service Selection */}
          {selectedCustomer && screen === SCREEN.SERVICE_SELECTION && (
            <ServiceSelector
              onServiceSelect={handleServiceSelect}
              onPackageSelect={handlePackageSelect}
              onStylistSelect={handleStylistSelect}
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              selectedStylists={selectedEmployees}
              stylists={availableStylists}
              locationId={locationId}
            />
          )}

          {/* Checkout Section */}
          {selectedCustomer && screen === SCREEN.CHECKOUT && (
            <CheckoutSection
              appointmentId={appointmentId}
              selectedCustomer={selectedCustomer}
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              services={availableServices}
              packages={availablePackages}
              discountType={discountType}
              discountValue={discountValue}
              paymentMethod={paymentMethod}
              startDate={startDate}
              startTime={startTime}
              notes={notes}
              onConfirm={handleConfirmCheckout}
              onCancel={handleCancelCheckout}
              employees={availableStylists}
              selectedEmployee={selectedEmployee}
              setSelectedEmployee={setSelectedEmployee}
              selectedEmployees={selectedEmployees}
              setSelectedEmployees={setSelectedEmployees}
              locationId={locationId}
              onDiscountTypeChange={(type) => setDiscountType(type)}
              onDiscountValueChange={(value) => setDiscountValue(value)}
              onPaymentMethodChange={(method) => {
                // Create a wrapper function to handle the string to string conversion properly
                setPaymentMethod(method as "cash" | "online");
              }}
            />
          )}

          {/* Appointment Summary */}
          {selectedCustomer && screen === SCREEN.SUMMARY && (
            <AppointmentSummary
              selectedCustomer={selectedCustomer}
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              services={availableServices}
              packages={availablePackages}
              discountType={discountType}
              discountValue={discountValue}
              paymentMethod={paymentMethod}
              startDate={startDate}
              startTime={startTime}
              notes={notes}
            />
          )}

          <Separator />

          {/* Navigation Buttons */}
          {selectedCustomer && screen === SCREEN.SERVICE_SELECTION && (
            <Button onClick={() => setScreen(SCREEN.CHECKOUT)}>
              Proceed to Checkout
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
