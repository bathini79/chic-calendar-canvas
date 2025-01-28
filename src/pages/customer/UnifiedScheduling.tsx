import { useCart } from "@/components/cart/CartContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { BookingSummary } from "@/components/scheduling/BookingSummary";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16 gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Schedule Services</h1>
            <div className="ml-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
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