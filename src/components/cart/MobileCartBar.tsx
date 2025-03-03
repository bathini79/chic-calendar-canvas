
import { useCart } from "./CartContext";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export function MobileCartBar() {
  const { items, selectedDate, selectedTimeSlots, getTotalPrice } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const isSchedulingPage = location.pathname === '/schedule';

  const totalPrice = getTotalPrice();

  if (items.length === 0) return null;

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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span>{items.length} items</span>
        </div>
        <span className="font-bold">{formatPrice(totalPrice)}</span>
      </div>
      <Button 
        onClick={handleContinue}
        className="flex-shrink-0"
        disabled={isSchedulingPage && (!selectedDate || !isTimeSelected)}
      >
        {isSchedulingPage ? 'Continue' : 'Schedule'}
      </Button>
    </div>
  );
}
