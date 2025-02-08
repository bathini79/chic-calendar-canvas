import { useCart } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ArrowRight, Clock, Package } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function BookingConfirmation() {
  const { items, selectedTimeSlots, selectedDate, selectedStylists, getTotalPrice, getTotalDuration } = useCart();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");

  if (!selectedDate || Object.keys(selectedTimeSlots).length === 0) {
    navigate('/schedule');
    return null;
  }

  const startTime = Object.values(selectedTimeSlots)[0];

  return (
    <div className="min-h-screen pb-24">
      <div className="container max-w-2xl mx-auto py-6 px-4">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Make Sure Everything's Right</h1>
            <p className="text-muted-foreground mt-2">
              {format(selectedDate, "EEEE d MMMM")}
            </p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{startTime}</span>
              <ArrowRight className="h-4 w-4" />
              <span>{format(new Date(selectedDate.setMinutes(selectedDate.getMinutes() + getTotalDuration())), 'HH:mm')}</span>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-start py-4 border-b">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">{item.service?.name || item.package?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStylists[item.id] && selectedStylists[item.id] !== 'any' && (
                      <>with {selectedStylists[item.id]}</>
                    )}
                  </p>
                </div>
                <div className="font-medium">
                  ₹{item.service?.selling_price || item.package?.price}
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <span className="font-medium">Booking Notes</span>
              <Textarea
                placeholder="Add any special requests or notes for your booking..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={4}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="text-2xl font-bold">₹{getTotalPrice()}</div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>{items.length} services</span>
                <span>•</span>
                <Clock className="h-4 w-4" />
                <span>{getTotalDuration()} minutes</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                // Handle booking confirmation
                console.log("Booking confirmed", { notes });
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
