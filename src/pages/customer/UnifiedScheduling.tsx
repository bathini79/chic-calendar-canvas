import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/components/cart/CartContext";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { BookingSummary } from "@/components/scheduling/BookingSummary";

export default function UnifiedScheduling() {
  const navigate = useNavigate();
  const { selectedServices, selectedPackages } = useCart();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Record<string, string>>({});

  const handleTimeSlotSelect = (serviceId: string, timeSlot: string) => {
    setSelectedTimeSlot((prev) => ({
      ...prev,
      [serviceId]: timeSlot,
    }));
  };

  const handleConfirm = () => {
    navigate("/booking-confirmation");
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <ServiceSelector />
      <UnifiedCalendar
        selectedServices={selectedServices}
        selectedPackages={selectedPackages}
        onTimeSlotSelect={handleTimeSlotSelect}
        selectedTimeSlot={selectedTimeSlot}
      />
      <BookingSummary
        selectedTimeSlot={selectedTimeSlot}
        onConfirm={handleConfirm}
      />
    </div>
  );
}