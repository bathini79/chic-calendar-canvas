
import { useCart } from "@/components/cart/CartContext";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { CartSummary } from "@/components/cart/CartSummary";
import { MobileCartBar } from "@/components/cart/MobileCartBar";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppointmentDetails } from "@/hooks/use-appointment-details";

export default function UnifiedScheduling() {
  const location = useLocation();
  const appointmentId = location.state?.appointmentId;
  const { appointment } = useAppointmentDetails(appointmentId);
  const [isRescheduling, setIsRescheduling] = useState(false);
  
  const { 
    items, 
    selectedDate, 
    setSelectedDate, 
    selectedTimeSlots, 
    setSelectedTimeSlots, 
    selectedStylists, 
    setSelectedStylists,
    selectedLocation
  } = useCart();
  const navigate = useNavigate();

  // Initialize stylists for each service with 'any' as default
  useEffect(() => {
    if (items.length > 0) {
      const newSelectedStylists = { ...selectedStylists };
      let updated = false;

      // For service items
      items.forEach(item => {
        if (item.service_id && !selectedStylists[item.service_id]) {
          newSelectedStylists[item.service_id] = 'any';
          updated = true;
        }
      });

      // For package items with services
      items.forEach(item => {
        if (item.package?.package_services) {
          item.package.package_services.forEach((ps: any) => {
            if (ps.service && ps.service.id && !selectedStylists[ps.service.id]) {
              newSelectedStylists[ps.service.id] = 'any';
              updated = true;
            }
          });
        }
      });

      // For customized services
      items.forEach(item => {
        if (item.customized_services && item.customized_services.length > 0) {
          item.customized_services.forEach((serviceId: string) => {
            if (!selectedStylists[serviceId]) {
              newSelectedStylists[serviceId] = 'any';
              updated = true;
            }
          });
        }
      });

      if (updated) {
        setSelectedStylists(newSelectedStylists);
      }
    }
  }, [items, selectedStylists, setSelectedStylists]);

  // Set the appointment date if rescheduling
  useEffect(() => {
    if (appointment && appointmentId && !isRescheduling) {
      // Set the appointment date for rescheduling
      const appointmentDate = new Date(appointment.start_time);
      setSelectedDate(appointmentDate);
      setIsRescheduling(true);
      
      toast.info("Select a new time for your appointment");
    }
  }, [appointment, appointmentId, setSelectedDate, isRescheduling]);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/services');
    }
  }, [items, navigate]);

  // Redirect if no location is selected
  useEffect(() => {
    if (!selectedLocation) {
      navigate('/services');
    }
  }, [selectedLocation, navigate]);

  const handleStylistSelect = (serviceId: string, stylistId: string) => {
    setSelectedStylists((prev) => ({
      ...prev,
      [serviceId]: stylistId,
    }));
  };

  const handleTimeSlotSelect = (itemId: string, timeSlot: string) => {
    setSelectedTimeSlots((prev) => ({
      ...prev,
      [itemId]: timeSlot,
    }));
  };

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4">
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-6 min-w-0">
          {appointmentId && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
              <h3 className="font-medium text-blue-800">Rescheduling Appointment</h3>
              <p className="text-sm text-blue-700">
                You're rescheduling your existing appointment. Select a new date and time below.
              </p>
            </div>
          )}
          
          <ServiceSelector 
            items={items}
            selectedStylists={selectedStylists}
            onStylistSelect={handleStylistSelect}
          />
          <UnifiedCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            selectedTimeSlots={selectedTimeSlots}
            onTimeSlotSelect={handleTimeSlotSelect}
            selectedStylists={selectedStylists}
            locationId={selectedLocation}
          />
        </div>
        <div className="hidden lg:block h-[calc(100vh-8rem)] sticky top-24">
          <CartSummary originalAppointmentId={appointmentId} />
        </div>
      </div>
      <MobileCartBar />
    </div>
  );
}
