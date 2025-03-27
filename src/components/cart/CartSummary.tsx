
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { useCart } from "./CartContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface CartSummaryProps {
  originalAppointmentId?: string;
}

export const CartSummary = ({ originalAppointmentId }: CartSummaryProps) => {
  const {
    items,
    selectedDate,
    selectedTimeSlots,
    selectedLocation,
    getTotalPrice,
    getTotalDuration
  } = useCart();
  const navigate = useNavigate();
  const [isRescheduleLoading, setIsRescheduleLoading] = useState(false);
  
  const { data: location } = useQuery({
    queryKey: ["location", selectedLocation],
    queryFn: async () => {
      if (!selectedLocation) return null;
      
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("id", selectedLocation)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLocation
  });

  const totalPrice = getTotalPrice();
  const totalDuration = getTotalDuration();
  
  const hours = Math.floor(totalDuration / 60);
  const minutes = totalDuration % 60;
  const durationText = `${hours > 0 ? `${hours}h` : ""} ${minutes > 0 ? `${minutes}m` : ""}`.trim();
  
  const allItemsHaveTimeSlots = items.every(item => selectedTimeSlots[item.id]);
  
  const handleCheckout = () => {
    if (!selectedDate) {
      toast.error("Please select an appointment date");
      return;
    }
    
    if (!allItemsHaveTimeSlots) {
      toast.error("Please select time slots for all services");
      return;
    }
    
    navigate("/checkout");
  };

  const handleReschedule = async () => {
    if (!originalAppointmentId) {
      return;
    }
    
    if (!selectedDate) {
      toast.error("Please select an appointment date");
      return;
    }
    
    if (!allItemsHaveTimeSlots) {
      toast.error("Please select time slots for all services");
      return;
    }
    
    try {
      setIsRescheduleLoading(true);
      
      // Update the original appointment with the new date/time
      const firstTimeSlot = Object.values(selectedTimeSlots)[0];
      const [hours, minutes] = firstTimeSlot.split(':').map(Number);
      
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, minutes, 0, 0);
      
      // Calculate end time based on total duration
      const endTime = new Date(appointmentDate);
      endTime.setMinutes(endTime.getMinutes() + totalDuration);
      
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: appointmentDate.toISOString(),
          end_time: endTime.toISOString()
        })
        .eq('id', originalAppointmentId);
      
      if (error) throw error;
      
      toast.success("Appointment successfully rescheduled");
      navigate('/profile');
    } catch (error: any) {
      console.error("Error rescheduling appointment:", error);
      toast.error("Failed to reschedule appointment: " + error.message);
    } finally {
      setIsRescheduleLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="border rounded-lg p-6 h-full flex flex-col justify-center items-center text-center space-y-4">
        <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <h3 className="font-medium text-lg">Your cart is empty</h3>
          <p className="text-muted-foreground">
            Add services to start booking your appointment
          </p>
        </div>
        <Button onClick={() => navigate("/services")} className="mt-2">
          Browse Services
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 space-y-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold">Order Summary</h2>

      <div className="space-y-4 flex-1">
        <div className="border-b pb-4">
          <div className="flex items-center mb-2">
            <ShoppingBag className="h-4 w-4 text-primary mr-2" />
            <h3 className="font-medium">Services</h3>
          </div>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm mt-2">
              <span>{item.name}</span>
              <span>{formatPrice(item.price)}</span>
            </div>
          ))}
        </div>

        <div className="border-b pb-4">
          <div className="flex items-center mb-2">
            <MapPin className="h-4 w-4 text-primary mr-2" />
            <h3 className="font-medium">Location</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {location?.name || "Loading..."}
          </p>
        </div>

        <div className="border-b pb-4">
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 text-primary mr-2" />
            <h3 className="font-medium">Date & Time</h3>
          </div>
          {selectedDate ? (
            <div className="text-sm text-muted-foreground">
              <p>{format(selectedDate, "EEEE, MMM d, yyyy")}</p>
              <div className="mt-1 space-y-1">
                {Object.entries(selectedTimeSlots).map(([itemId, time]) => {
                  const item = items.find((i) => i.id === itemId);
                  return (
                    <div key={itemId} className="flex justify-between">
                      <span>{item?.name}</span>
                      <span>{time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a date and time
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center mb-2">
            <Clock className="h-4 w-4 text-primary mr-2" />
            <h3 className="font-medium">Duration</h3>
          </div>
          <p className="text-sm text-muted-foreground">{durationText}</p>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between font-semibold mb-4">
          <span>Total</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>
        
        {originalAppointmentId ? (
          <Button
            onClick={handleReschedule}
            disabled={!selectedDate || !allItemsHaveTimeSlots || isRescheduleLoading}
            className="w-full"
          >
            {isRescheduleLoading ? "Processing..." : "Confirm Reschedule"}
          </Button>
        ) : (
          <Button
            onClick={handleCheckout}
            disabled={!selectedDate || !allItemsHaveTimeSlots}
            className="w-full"
          >
            Proceed to Checkout
          </Button>
        )}
      </div>
    </div>
  );
};
