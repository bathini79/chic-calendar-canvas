import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/components/cart/CartContext";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { BookingSummary } from "@/components/scheduling/BookingSummary";

export default function UnifiedScheduling() {
  const navigate = useNavigate();
  const { items: cartItems } = useCart();
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});

  const handleTimeSlotSelect = (serviceId: string, timeSlot: string) => {
    setSelectedTimeSlots((prev) => ({
      ...prev,
      [serviceId]: timeSlot,
    }));
  };

  const handleStylistSelect = (serviceId: string, stylistId: string) => {
    setSelectedStylists((prev) => ({
      ...prev,
      [serviceId]: stylistId,
    }));
  };

  const handleConfirm = () => {
    navigate("/booking-confirmation");
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <ServiceSelector 
        items={cartItems}
        selectedStylists={selectedStylists}
        onStylistSelect={handleStylistSelect}
      />
      <UnifiedCalendar
        items={cartItems}
        onTimeSlotSelect={handleTimeSlotSelect}
        selectedTimeSlots={selectedTimeSlots}
        selectedStylists={selectedStylists}
      />
      <BookingSummary
        selectedTimeSlots={selectedTimeSlots}
        selectedStylists={selectedStylists}
        items={cartItems}
        onConfirm={handleConfirm}
      />
    </div>
  );
}