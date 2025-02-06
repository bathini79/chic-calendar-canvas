import { useState } from "react";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { BookingSummary } from "@/components/scheduling/BookingSummary";

export function UnifiedScheduling() {
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});

  const handleTimeSlotSelect = (itemId: string, timeSlot: string) => {
    setSelectedTimeSlots((prev) => ({
      ...prev,
      [itemId]: timeSlot,
    }));
  };

  const handleStylistSelect = (itemId: string, stylistId: string) => {
    setSelectedStylists((prev) => ({
      ...prev,
      [itemId]: stylistId,
    }));
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <ServiceSelector />
      <UnifiedCalendar
        onTimeSlotSelect={handleTimeSlotSelect}
        onStylistSelect={handleStylistSelect}
        selectedTimeSlots={selectedTimeSlots}
        selectedStylists={selectedStylists}
      />
      <BookingSummary
        selectedTimeSlots={selectedTimeSlots}
        selectedStylists={selectedStylists}
      />
    </div>
  );
}