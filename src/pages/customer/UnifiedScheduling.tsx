import { useCart } from "@/components/cart/CartContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { Button } from "@/components/ui/button";

export default function UnifiedScheduling() {
  const { 
    items, 
    selectedDate, 
    setSelectedDate, 
    selectedTimeSlots, 
    setSelectedTimeSlots, 
    selectedStylists, 
    setSelectedStylists 
  } = useCart();
  const navigate = useNavigate();
  const [localSelectedStylists, setLocalSelectedStylists] = useState<Record<string, string>>({});

  useEffect(() => {
    if (items.length === 0) {
      navigate('/services');
    }
  }, [items, navigate]);

  const handleStylistSelect = (itemId: string, stylistId: string) => {
    setLocalSelectedStylists(prev => ({ ...prev, [itemId]: stylistId }));
    setSelectedStylists(prev => ({ ...prev, [itemId]: stylistId }));
  };

  const handleContinue = () => {
    if (selectedDate && Object.keys(selectedTimeSlots).length === items.length) {
      navigate('/booking-confirmation');
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-4 sm:py-8 px-4 overflow-hidden">
      <h1 className="text-2xl font-bold mb-4 sm:mb-6">Schedule Your Services</h1>
      <div className="space-y-4 sm:space-y-6 min-w-0">
        <ServiceSelector 
          items={items}
          selectedStylists={localSelectedStylists}
          onStylistSelect={handleStylistSelect}
        />
        <UnifiedCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          selectedTimeSlots={selectedTimeSlots}
          onTimeSlotSelect={(itemId, timeSlot) =>
            setSelectedTimeSlots(prev => ({ ...prev, [itemId]: timeSlot }))
          }
          selectedStylists={selectedStylists}
        />
        <div className="flex justify-end">
          <Button 
            size="lg"
            onClick={handleContinue}
            disabled={!selectedDate || Object.keys(selectedTimeSlots).length !== items.length}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}