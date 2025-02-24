
import { useCart } from "@/components/cart/CartContext";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { CartSummary } from "@/components/cart/CartSummary";
import { MobileCartBar } from "@/components/cart/MobileCartBar";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    if (items.length === 0) {
      navigate('/services');
    }
  }, [items, navigate]);

  const handleStylistSelect = (itemId: string, stylistId: string) => {
    setSelectedStylists((prev) => ({
      ...prev,
      [itemId]: stylistId,
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
