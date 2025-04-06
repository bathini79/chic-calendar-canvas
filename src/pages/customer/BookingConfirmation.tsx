import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/components/cart/CartContext";
import { format, addMinutes } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomerAppointment } from "@/hooks/use-customer-appointment";

export default function BookingConfirmation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createAppointment, isLoading } = useCustomerAppointment();

  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from("locations").select("*");
      if (error) {
        console.error("Error fetching locations:", error);
        toast.error("Failed to load locations");
      } else {
        setLocations(data || []);
        if (data && data.length > 0) {
          setSelectedLocation(data[0].id);
        }
      }
    };

    fetchLocations();
  }, []);

  useEffect(() => {
    if (cartItems && cartItems.length > 0) {
      const earliestTime = cartItems.reduce((prev, curr) => {
        return prev.start_time < curr.start_time ? prev : curr;
      });

      const latestTime = cartItems.reduce((prev, curr) => {
        return prev.end_time > curr.end_time ? prev : curr;
      });

      const startTime = new Date(earliestTime.start_time);
      const endTime = new Date(latestTime.end_time);

      setStartTime(startTime);
      setEndTime(endTime);
    }
  }, [cartItems]);

  const handleConfirmBooking = async () => {
    if (!user || !cartItems.length) return;

    try {
      setIsSubmitting(true);

      // Create the appointment
      const appointmentId = await createAppointment({
        customerId: user.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        cartItems,
        locationId: selectedLocation || locations[0]?.id,
        notes: specialRequests,
        totalPrice: cartTotal,
      });

      if (appointmentId) {
        // Clear the cart
        await Promise.all(
          cartItems.map((item) =>
            supabase.from("cart_items").delete().eq("id", item.id)
          )
        );

        // Show success message and navigate
        toast.success("Appointment booked successfully!");
        navigate("/customer/appointments");
      }
    } catch (error: any) {
      console.error("Error booking appointment:", error);
      toast.error(error.message || "Failed to book appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-12">
      <Card>
        <CardHeader>
          <CardTitle>Confirm Your Booking</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <h2 className="text-lg font-semibold">Appointment Details</h2>
            <p>
              <strong>Date:</strong> {format(startTime, "MMMM d, yyyy")}
            </p>
            <p>
              <strong>Time:</strong> {format(startTime, "h:mm a")} -{" "}
              {format(endTime, "h:mm a")}
            </p>
            <p>
              <strong>Location:</strong>{" "}
              {locations.find((loc) => loc.id === selectedLocation)?.name ||
                "Not Selected"}
            </p>
            <p>
              <strong>Total:</strong> ${cartTotal}
            </p>
          </div>

          <Separator />

          <div className="grid gap-2">
            <h2 className="text-lg font-semibold">Services</h2>
            <ul>
              {cartItems.map((item) => (
                <li key={item.id}>
                  {item.name} - ${item.selling_price}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div className="grid gap-2">
            <label htmlFor="requests">Special Requests</label>
            <Textarea
              id="requests"
              placeholder="Any special requests for your appointment?"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleConfirmBooking} disabled={isLoading || isSubmitting}>
            {isLoading || isSubmitting ? "Booking..." : "Confirm Booking"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
