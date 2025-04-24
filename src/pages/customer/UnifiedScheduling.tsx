import { useCart } from "@/components/cart/CartContext";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { CartSummary } from "@/components/cart/CartSummary";
import { MobileCartBar } from "@/components/cart/MobileCartBar";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function UnifiedScheduling() {
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
    // Special case to handle reset operation
    if (itemId === 'reset') {
      setSelectedTimeSlots({});
      return;
    }
    
    // Normal case - add or update a time slot
    setSelectedTimeSlots((prev) => ({
      ...prev,
      [itemId]: timeSlot,
    }));
  };

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4">
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-6 min-w-0">
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
          <CartSummary />
        </div>
      </div>
      <MobileCartBar />
    </div>
  );
}
