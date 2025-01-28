import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CalendarClock, Clock, ChevronRight } from "lucide-react";

interface ModernSchedulerProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  selectedTimeSlots: Record<string, string>;
  onTimeSlotSelect: (itemId: string, timeSlot: string) => void;
  timeSlots: { time: string; endTime: string; isAvailable: boolean; isSelected: boolean; }[];
  items: any[];
}

export function ModernScheduler({
  selectedDate,
  onDateSelect,
  selectedTimeSlots,
  onTimeSlotSelect,
  timeSlots,
  items
}: ModernSchedulerProps) {
  const [isTimeSheetOpen, setIsTimeSheetOpen] = useState(false);

  const handleDateSelect = (date: Date | null) => {
    onDateSelect(date);
    if (date) {
      setIsTimeSheetOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Select Date & Time</h2>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          className="rounded-md border"
          disabled={(date) => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            return date < now;
          }}
        />
      </div>

      <Sheet open={isTimeSheetOpen} onOpenChange={setIsTimeSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select Time"}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-full mt-6 pb-20">
            <div className="grid grid-cols-2 gap-3 px-2">
              {timeSlots.map((slot) => (
                <Button
                  key={slot.time}
                  variant={slot.isSelected ? "default" : "outline"}
                  className={cn(
                    "h-auto py-4 flex flex-col items-center gap-1",
                    !slot.isAvailable && "opacity-50 cursor-not-allowed",
                    slot.isSelected && "bg-primary hover:bg-primary/90"
                  )}
                  disabled={!slot.isAvailable}
                  onClick={() => {
                    if (slot.isAvailable && !slot.isSelected) {
                      items.forEach((item) => {
                        onTimeSlotSelect(item.id, slot.time);
                      });
                    }
                  }}
                >
                  <span className="text-sm font-medium">{slot.time}</span>
                  <Badge variant="secondary" className="mt-1">
                    {slot.endTime}
                  </Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
            <Button 
              className="w-full"
              onClick={() => setIsTimeSheetOpen(false)}
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}