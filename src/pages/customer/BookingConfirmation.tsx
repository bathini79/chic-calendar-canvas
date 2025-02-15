import { useCart } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format, addMinutes } from "date-fns";
import { ArrowRight, Calendar, Clock, Package, Store } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BookingConfirmation() {
  const {
    items,
    selectedTimeSlots,
    selectedDate,
    selectedStylists,
    getTotalPrice,
    getTotalDuration,
    removeFromCart
  } = useCart();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleBookingConfirmation = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to continue");
        return;
      }

      const customer_id = session.user.id;

      const startDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${startTime}`);
      if (isNaN(startDateTime.getTime())) {
        console.error(`Invalid date generated, date: ${format(selectedDate, 'yyyy-MM-dd')}, time: ${startTime}`);
        return;
      }
      const endDateTime = addMinutes(startDateTime, totalDuration);

      // 1. Insert into appointments table
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          customer_id: customer_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          notes: notes,
          status: 'confirmed',
          number_of_bookings:items.length,
          total_price: getTotalPrice(),
          total_duration: totalDuration
        })
        .select(); // Fetch the inserted appointment data

      if (appointmentError) {
        console.error("Error inserting appointment:", appointmentError);
        toast.error("Failed to create appointment. Please try again.");
        throw appointmentError;
      }

      const appointmentId = appointmentData[0].id;

      // 2. Iterate through each item in the cart to create bookings
      for (const item of items) {
        console.log("item",item)
        // Insert a new booking into the 'bookings' table.
        const { error: bookingError } = await supabase.from('bookings').insert({
          appointment_id: appointmentId,
          service_id: item.service_id,
          package_id: item.package_id,
          employee_id: selectedStylists[item.id] !== 'any' ? selectedStylists[item.id] : null,
          status: 'confirmed',
          price_paid: item.service.selling_price
        });

        if (bookingError) {
          console.error("Error inserting booking:", bookingError);
          if (bookingError.code === '23505') { // Unique constraint violation
            toast.error(`Booking conflict: ${bookingError.message}`);
          } else {
            toast.error("Failed to create booking. Please try again.");
          }
          throw bookingError;
        }
      }

      toast.success("Booking confirmed successfully!");
      clearCart()
      navigate('/profile'); // Redirect to profile

    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to confirm booking");
    } finally {
      setIsLoading(false);
    }
  };
  const clearCart = async () => {
    for (const item of items) {
      await removeFromCart(item.id);
    }
  };
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
              {format(addMinutes(new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${startTime}`),getTotalDuration()), 'hh:mm a')}
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
              <div className="flex items-center gap-2 ">
                <Store className="h-4 w-4" />
                <span className="font-bold">Pay at Salon</span>
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
              onClick={handleBookingConfirmation}
              disabled={isLoading}
            >
              {isLoading ? "Confirming..." : "Confirm"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
