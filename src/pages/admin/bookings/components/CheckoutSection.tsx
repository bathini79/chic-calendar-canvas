import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatPrice } from '@/lib/utils';
import { CalendarIcon, CheckCheck, DollarSign, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CheckoutSectionProps {
  appointmentId: string;
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: any[];
  packages: any[];
  discountType: "none" | "fixed" | "percentage";
  discountValue: number;
  paymentMethod: string;
  startDate: Date;
  startTime: string;
  notes: string;
  onConfirm: (appointment: any) => void;
  onCancel: () => void;
  employees: any[];
  selectedEmployee: { id: string; name: string } | null;
  setSelectedEmployee: (employee: { id: string; name: string } | null) => void;
  selectedEmployees: Record<string, { id: string; name: string }>;
  setSelectedEmployees: (employees: Record<string, { id: string; name: string }>) => void;
  locationId?: string; // Add locationId prop
}

export function CheckoutSection({
  appointmentId,
  selectedCustomer,
  selectedServices,
  selectedPackages,
  services,
  packages,
  discountType,
  discountValue,
  paymentMethod,
  startDate,
  startTime,
  notes,
  onConfirm,
  onCancel,
  employees,
  selectedEmployee,
  setSelectedEmployee,
  selectedEmployees,
  setSelectedEmployees,
  locationId
}: CheckoutSectionProps) {
  const [totalPrice, setTotalPrice] = useState(0);
  const [discountedPrice, setDiscountedPrice] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    // Calculate total price based on selected services and packages
    let calculatedTotalPrice = 0;

    // Add prices from selected services
    selectedServices.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        calculatedTotalPrice += service.selling_price;
      }
    });

    // Add prices from selected packages
    selectedPackages.forEach(packageId => {
      const packageItem = packages.find(p => p.id === packageId);
      if (packageItem) {
        calculatedTotalPrice += packageItem.price;
      }
    });

    setTotalPrice(calculatedTotalPrice);

    // Apply discount
    let calculatedDiscountedPrice = calculatedTotalPrice;
    if (discountType === "fixed") {
      calculatedDiscountedPrice = Math.max(0, calculatedTotalPrice - discountValue);
    } else if (discountType === "percentage") {
      const discountAmount = (discountValue / 100) * calculatedTotalPrice;
      calculatedDiscountedPrice = Math.max(0, calculatedTotalPrice - discountAmount);
    }
    setDiscountedPrice(calculatedDiscountedPrice);
  }, [selectedServices, selectedPackages, services, packages, discountType, discountValue]);

  const confirmAppointment = async () => {
    setIsConfirming(true);
    try {
      // Format start time
      const [hours, minutes] = startTime.split(':');
      const startDateTime = new Date(startDate);
      startDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      // Calculate end time
      let totalDuration = 0;
      selectedServices.forEach(serviceId => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          totalDuration += service.duration;
        }
      });
      selectedPackages.forEach(packageId => {
        const packageItem = packages.find(p => p.id === packageId);
        if (packageItem) {
          packageItem.services.forEach(service => {
            totalDuration += service.duration;
          });
        }
      });
      const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);

      // Prepare bookings data
      const bookingsData = [];

      // Add bookings for selected services
      selectedServices.forEach(serviceId => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          bookingsData.push({
            service_id: service.id,
            price_paid: service.selling_price,
            employee_id: selectedEmployees[service.id]?.id || selectedEmployee?.id,
            status: 'booked'
          });
        }
      });

      // Add bookings for selected packages
      selectedPackages.forEach(packageId => {
        const packageItem = packages.find(p => p.id === packageId);
        if (packageItem) {
          packageItem.services.forEach(service => {
            bookingsData.push({
              service_id: service.id,
              price_paid: service.selling_price,
              employee_id: selectedEmployees[service.id]?.id || selectedEmployee?.id,
              status: 'booked'
            });
          });
        }
      });

      // Create appointment data
      const appointmentData = {
        customer_id: selectedCustomer.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        total_price: discountedPrice,
        payment_method: paymentMethod,
        notes: notes,
        status: 'booked',
        discount_type: discountType,
        discount_value: discountValue,
        total_duration: totalDuration,
        location: locationId
      };

      if (appointmentId) {
        // Update existing appointment
        const { data: updatedAppointment, error: updateError } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointmentId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        // Delete existing bookings and create new ones
        const { error: deleteError } = await supabase
          .from('bookings')
          .delete()
          .eq('appointment_id', appointmentId);

        if (deleteError) {
          throw deleteError;
        }

        const { data: newBookings, error: bookingError } = await supabase
          .from('bookings')
          .insert(
            bookingsData.map(booking => ({
              ...booking,
              appointment_id: appointmentId
            }))
          )
          .select();

        if (bookingError) {
          throw bookingError;
        }

        toast.success('Appointment updated successfully');
        onConfirm(updatedAppointment);
      } else {
        // Create new appointment
        const { data: newAppointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert([appointmentData])
          .select()
          .single();

        if (appointmentError) {
          throw appointmentError;
        }

        const { data: newBookings, error: bookingError } = await supabase
          .from('bookings')
          .insert(
            bookingsData.map(booking => ({
              ...booking,
              appointment_id: newAppointment.id
            }))
          )
          .select();

        if (bookingError) {
          throw bookingError;
        }

        toast.success('Appointment created successfully');
        onConfirm(newAppointment);
      }
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(error.message || 'Failed to create appointment');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Checkout</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center space-x-4">
          <User className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-700">{selectedCustomer?.full_name}</p>
            <p className="text-sm text-gray-500">{selectedCustomer?.email}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Services</Label>
          <div className="flex flex-wrap gap-2">
            {selectedServices.map(serviceId => {
              const service = services.find(s => s.id === serviceId);
              return (
                service && (
                  <div
                    key={service.id}
                    className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700"
                  >
                    {service.name}
                  </div>
                )
              );
            })}
            {selectedPackages.map(packageId => {
              const packageItem = packages.find(p => p.id === packageId);
              return (
                packageItem && (
                  <div
                    key={packageItem.id}
                    className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700"
                  >
                    {packageItem.name}
                  </div>
                )
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Date and Time</Label>
          <p className="text-sm text-gray-700">
            {format(startDate, 'MMMM dd, yyyy')} at {startTime}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <p className="text-sm text-gray-700">{paymentMethod}</p>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <p className="text-sm text-gray-700">{notes}</p>
        </div>
        <div className="space-y-2">
          <Label>Total Price</Label>
          <p className="text-xl font-semibold">{formatPrice(totalPrice)}</p>
        </div>
        <div className="space-y-2">
          <Label>Discounted Price</Label>
          <p className="text-xl font-semibold">{formatPrice(discountedPrice)}</p>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={confirmAppointment} disabled={isConfirming}>
            {isConfirming ? 'Confirming...' : 'Confirm'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
