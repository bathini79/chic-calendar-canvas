
import { useCart } from "@/components/cart/CartContext";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    setLocalSelectedStylists((prev) => ({
      ...prev,
      [itemId]: stylistId,
    }));
  };

  const handleTimeSlotSelect = (itemId: string, timeSlot: string) => {
    setSelectedTimeSlots({
      ...selectedTimeSlots,
      [itemId]: timeSlot,
    });
  };

  const handleContinue = () => {
    setSelectedStylists(localSelectedStylists);
    navigate('/booking-confirmation');
  };

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4">
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
          onTimeSlotSelect={handleTimeSlotSelect}
          selectedStylists={selectedStylists}
        />
        {selectedDate && Object.keys(selectedTimeSlots).length === items.length && (
          <div className="flex justify-end">
            <Button size="lg" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
