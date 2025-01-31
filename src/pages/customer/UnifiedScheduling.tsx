import { useCart } from "@/components/cart/CartContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { BookingSummary } from "@/components/scheduling/BookingSummary";

export default function UnifiedScheduling() {
  const { items } = useCart();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});

  useEffect(() => {
    if (items.length === 0) {
      navigate('/services');
    }
  }, [items, navigate]);

  // Reset date and time slots when stylists change
  useEffect(() => {
    setSelectedDate(null);
    setSelectedTimeSlots({});
  }, [selectedStylists]);

  return (
    <div className="container max-w-7xl mx-auto py-4 sm:py-8 px-4 overflow-hidden">
    <h1 className="text-2xl font-bold mb-4 sm:mb-6">Schedule Your Services</h1>
    <div className="grid gap-6 lg:grid-cols-[1fr,minmax(250px,300px)]">
      <div className="space-y-4 sm:space-y-6 min-w-0">
        <ServiceSelector 
          items={items}
          selectedStylists={selectedStylists}
          onStylistSelect={(itemId, stylistId) => 
            setSelectedStylists(prev => ({ ...prev, [itemId]: stylistId }))
          }
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
      </div>
      <div className="order-first lg:order-none min-w-0">
        <BookingSummary
          items={items}
          selectedDate={selectedDate}
          selectedTimeSlots={selectedTimeSlots}
          selectedStylists={selectedStylists}
        />
      </div>
    </div>
  </div>
  
  );
}