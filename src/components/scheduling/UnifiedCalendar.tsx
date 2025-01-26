import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/components/cart/CartContext";
import { format } from "date-fns";

export function UnifiedCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { items } = useCart();

  const timeSlots = [
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Date & Time</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
        />

        {selectedDate && (
          <div className="space-y-4">
            <h3 className="font-medium">
              Available times for {format(selectedDate, "MMMM d, yyyy")}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  className="p-2 text-sm border rounded-md hover:bg-accent"
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}