
import { useCart } from "./CartContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";

export function MobileCartBar() {
  const { items } = useCart();
  const navigate = useNavigate();

  const totalPrice = items.reduce((sum, item) => {
    return sum + (item.service?.selling_price || item.package?.price || 0);
  }, 0);

  if (items.length === 0) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span>{items.length} items</span>
        </div>
        <span className="font-bold">₹{totalPrice}</span>
      </div>
      <Button 
        onClick={() => navigate('/schedule')}
        className="flex-shrink-0"
      >
        Continue
      </Button>
    </div>
  );
}
