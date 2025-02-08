
import { useCart } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ArrowRight, Calendar, Clock, Package, Store } from "lucide-react";
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
  const totalDuration = getTotalDuration();
  const totalHours = Math.floor(totalDuration / 60);
  const remainingMinutes = totalDuration % 60;
  const durationDisplay = totalHours > 0 
    ? `${totalHours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`
    : `${remainingMinutes}m`;

  return (
    <div className="min-h-screen pb-24">
      <div className="container max-w-2xl mx-auto py-6 px-4">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Make Sure Everything's Right</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-2">
              <Calendar className="h-4 w-4" />
              <p>{format(selectedDate, "EEEE d MMMM")}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(`2000/01/01 ${startTime}`), 'hh:mm a')}</span>
              <ArrowRight className="h-4 w-4" />
              <span>
                {format(new Date(selectedDate.setMinutes(selectedDate.getMinutes() + getTotalDuration())), 'hh:mm a')}
                <span className="ml-1 text-sm">({durationDisplay})</span>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item) => {
              const itemDuration = item.service?.duration || item.package?.duration || 0;
              const hours = Math.floor(itemDuration / 60);
              const minutes = itemDuration % 60;
              const itemDurationDisplay = hours > 0 
                ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
                : `${minutes}m`;

              return (
                <div key={item.id} className="flex justify-between items-start py-4 border-b">
                  <div className="space-y-1">
                    <h3 className="text-sm">{item.service?.name || item.package?.name}</h3>
                    <div className="space-y-0.5">
                      {selectedStylists[item.id] && selectedStylists[item.id] !== 'any' && (
                        <p className="text-sm text-muted-foreground">
                          with {selectedStylists[item.id]}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {itemDurationDisplay}
                      </p>
                    </div>
                  </div>
                  <div className="font-medium">
                    ₹{item.service?.selling_price || item.package?.price}
                  </div>
                </div>
              );
            })}

            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Store className="h-4 w-4" />
                <span>Pay At Salon</span>
              </div>
            </Card>

            <div className="space-y-2 mt-8">
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
              <div className="text-2xl font-bold text-foreground">₹{getTotalPrice()}</div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>{items.length} services</span>
                <span>•</span>
                <Clock className="h-4 w-4" />
                <span>{durationDisplay}</span>
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
