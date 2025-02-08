
import { useCart } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Clock, Package, Store } from "lucide-react";
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

  return (
    <div className="min-h-screen pb-24">
      <div className="container max-w-2xl mx-auto py-6 px-4">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Make Sure Everything's Good</h1>
            <p className="text-muted-foreground mt-1">Review your booking details before confirming</p>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="border rounded-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    {item.service?.name || item.package?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{format(selectedDate, "MMMM d, yyyy")}</span>
                    <span>at</span>
                    <span>{selectedTimeSlots[item.id]}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.service?.duration || item.package?.duration} minutes • ₹{item.service?.selling_price || item.package?.price}
                  </div>
                  {selectedStylists[item.id] && selectedStylists[item.id] !== 'any' && (
                    <div className="text-sm text-muted-foreground">
                      with {selectedStylists[item.id]}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Card className="border rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Store className="h-4 w-4" />
                  <span>Pay at Salon</span>
                </div>
              </CardContent>
            </Card>
            <div>
              <span >Booking Notes</span>
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
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>{items.length} services</span>
                <span>•</span>
                <span>{getTotalDuration()} minutes</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                ₹{getTotalPrice()}
              </div>
              <Button
                size="lg"
                onClick={() => {
                  // Handle booking confirmation
                  console.log("Booking confirmed", { notes });
                }}
              >
                Confirm Booking
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
