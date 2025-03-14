
import { useCart } from "@/components/cart/CartContext";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { CartSummary } from "@/components/cart/CartSummary";
import { MobileCartBar } from "@/components/cart/MobileCartBar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

export default function UnifiedScheduling() {
  const { 
    items, 
    selectedDate, 
    setSelectedDate, 
    selectedTimeSlots, 
    setSelectedTimeSlots, 
    selectedStylists, 
    setSelectedStylists,
    selectedLocation,  // Get selected location from the cart context
    setSelectedLocation  // Set selected location in the cart context
  } = useCart();
  const navigate = useNavigate();
  
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate('/services');
    }
    
    // If no location is selected yet but we have locations, select the first one by default
    if (!selectedLocation && locations.length > 0) {
      setSelectedLocation(locations[0].id);
    }
  }, [items, navigate, locations, selectedLocation, setSelectedLocation]);

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
      <div className="mb-6 flex items-center justify-end">
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Select 
            value={selectedLocation} 
            onValueChange={setSelectedLocation}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-6 min-w-0">
          <ServiceSelector 
            items={items}
            selectedStylists={selectedStylists}
            onStylistSelect={handleStylistSelect}
            locationId={selectedLocation}
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
