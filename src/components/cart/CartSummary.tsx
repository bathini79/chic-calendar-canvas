
import { useCart } from "./CartContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";

export function CartSummary() {
  const { 
    items, 
    removeFromCart, 
    selectedDate, 
    selectedTimeSlots,
    getTotalPrice
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const isSchedulingPage = location.pathname === '/schedule';

  const totalPrice = getTotalPrice();
  const isTimeSelected = Object.keys(selectedTimeSlots).length > 0;

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
        <p className="text-2xl font-bold mt-2">₹{totalPrice}</p>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Your cart is empty
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col space-y-2 p-4 border rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">
                      {item.service?.name || item.package?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Duration: {item.service?.duration || (item?.duration || item.package?.duration)} min
                    </p>
                    <p className="text-sm font-medium">
                      ₹{item.service?.selling_price || 
                         (item.selling_price || item.package?.price)}
                    </p>
                    {isSchedulingPage && selectedTimeSlots[item.id] && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {format(selectedDate!, "MMM d")} at {selectedTimeSlots[item.id]}
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
            ))
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
