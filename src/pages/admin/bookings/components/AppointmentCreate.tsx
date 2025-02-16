
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ServiceSelector } from "./ServiceSelector";
import { supabase } from "@/integrations/supabase/client";

interface AppointmentCreateProps {
  customerId: string;
  selectedDate?: Date | null;
  selectedTime?: string;
}

export function AppointmentCreate({ 
  customerId, 
  selectedDate, 
  selectedTime 
}: AppointmentCreateProps) {
  const navigate = useNavigate();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [customizedPackageServices, setCustomizedPackageServices] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handlePackageSelect = (packageId: string, services: string[]) => {
    setSelectedPackages(prev => 
      prev.includes(packageId)
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    );
    
    if (services.length > 0) {
      setCustomizedPackageServices(prev => ({
        ...prev,
        [packageId]: services
      }));
    }
  };

  const handleSaveAppointment = async () => {
    try {
      setIsLoading(true);

      if (!selectedDate || !selectedTime) {
        toast.error("Please select a date and time");
        return;
      }

      // Calculate start_time by combining date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      // Create the appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          customer_id: customerId,
          start_time: startTime.toISOString(),
          end_time: startTime.toISOString(), // Will be calculated properly
          status: 'inprogress',
          total_price: 0 // Will be updated with actual total
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Create bookings for services
      const serviceBookings = selectedServices.map(serviceId => ({
        appointment_id: appointment.id,
        service_id: serviceId,
        status: 'pending',
        price_paid: 0 // Will be updated with actual price
      }));

      // Create bookings for packages
      const packageBookings = selectedPackages.map(packageId => ({
        appointment_id: appointment.id,
        package_id: packageId,
        status: 'pending',
        price_paid: 0, // Will be updated with actual price
        customized_services: customizedPackageServices[packageId] || []
      }));

      // Insert all bookings
      const { error: bookingsError } = await supabase
        .from('bookings')
        .insert([...serviceBookings, ...packageBookings]);

      if (bookingsError) throw bookingsError;

      toast.success("Appointment created successfully");
      navigate(`/admin/bookings/${appointment.id}`);
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    await handleSaveAppointment();
    // Navigate to checkout page
    // This will be implemented in the next phase
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Appointment</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceSelector
            onServiceSelect={handleServiceSelect}
            onPackageSelect={handlePackageSelect}
            selectedServices={selectedServices}
            selectedPackages={selectedPackages}
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Button 
            variant="outline"
            onClick={handleSaveAppointment}
            disabled={isLoading || (selectedServices.length === 0 && selectedPackages.length === 0)}
          >
            Save Appointment
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={isLoading || (selectedServices.length === 0 && selectedPackages.length === 0)}
          >
            Checkout
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
