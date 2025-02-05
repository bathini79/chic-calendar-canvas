import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { BookingSummary } from "@/components/scheduling/BookingSummary";

export default function UnifiedScheduling() {
  const { selectedServices, selectedPackages } = useCart();
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});

  const handleTimeSlotSelect = (serviceId: string, timeSlot: string) => {
    setSelectedTimeSlots((prev) => ({
      ...prev,
      [serviceId]: timeSlot,
    }));
  };

  const handleConfirm = () => {
    // Implement booking confirmation logic
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <ServiceSelector />
      
      <UnifiedCalendar
        onTimeSlotSelect={handleTimeSlotSelect}
        selectedTimeSlots={selectedTimeSlots}
      />
      
      <BookingSummary
        selectedTimeSlots={selectedTimeSlots}
        onConfirm={handleConfirm}
      />
    </div>
  );
}