
import { useCart } from "./CartContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { format, addMinutes } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { User, Clock } from "lucide-react";

export function CartSummary() {
  const { 
    items, 
    removeFromCart, 
    selectedDate, 
    selectedTimeSlots,
    selectedStylists,
    stylists,
    getTotalPrice
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const isSchedulingPage = location.pathname === '/schedule';

  const totalPrice = getTotalPrice();
  const isTimeSelected = Object.keys(selectedTimeSlots).length > 0;
  
  // Sort items by their scheduled start time
  const sortedItems = [...items].sort((a, b) => {
    const aTime = selectedTimeSlots[a.id] || "00:00";
    const bTime = selectedTimeSlots[b.id] || "00:00";
    return aTime.localeCompare(bTime);
  });

  const getStylistName = (stylistId: string) => {
    const stylist = stylists?.find(s => s.id === stylistId);
    return stylist ? stylist.name : '';
  };

  const handleContinue = () => {
    if (isSchedulingPage) {
      if (selectedDate && isTimeSelected) {
        navigate('/booking-confirmation');
      }
    } else {
      navigate('/schedule');
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Your Cart ({items.length} items)</h2>
        <p className="text-2xl font-bold mt-2">{formatPrice(totalPrice)}</p>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Your cart is empty
            </p>
          ) : (
            sortedItems.map((item) => {
              const itemDuration = item.service?.duration || item.duration || item.package?.duration || 0;
              const itemPrice = item.selling_price || item.service?.selling_price || item.package?.price || 0;
              const stylistId = selectedStylists[item.id];
              const stylistName = stylistId ? getStylistName(stylistId) : '';
              
              return (
                <div
                  key={item.id}
                  className="flex flex-col space-y-2 p-4 border rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-medium">
                        {item.service?.name || item.package?.name}
                      </h3>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          <span>Duration: {itemDuration} min</span>
                        </div>
                        {stylistName && (
                          <div className="flex items-center">
                            <User className="mr-1 h-4 w-4" />
                            <span>{stylistName}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium">
                        {formatPrice(itemPrice)}
                      </p>
                      {isSchedulingPage && selectedTimeSlots[item.id] && selectedDate && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {format(selectedDate, "MMM d")} at {format(
                            new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTimeSlots[item.id]}`),
                            "h:mm a"
                          )} - 
                          {format(
                            addMinutes(
                              new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTimeSlots[item.id]}`),
                              itemDuration
                            ),
                            "h:mm a"
                          )}
                        </p>
                      )}
                    </div>
                    {!isSchedulingPage && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button 
          className="w-full" 
          onClick={handleContinue}
          disabled={items.length === 0 || (isSchedulingPage && 
            (!selectedDate || !isTimeSelected))}
        >
          {isSchedulingPage ? 'Continue to Booking' : 'Continue to Schedule'}
        </Button>
      </div>
    </Card>
  );
}
