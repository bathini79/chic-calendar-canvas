import { useCart } from "./CartContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export function CartSummary() {
  const { items, removeFromCart } = useCart();
  const navigate = useNavigate();

  const totalPrice = items.reduce((sum, item) => {
    return sum + (item.service?.selling_price || item.package?.price || 0);
  }, 0);

  const handleContinue = () => {
    navigate('/schedule');
  };

  return (
    <Card className="hidden lg:flex flex-col h-full">
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
                      Duration: {item.service?.duration || item.package?.duration} min
                    </p>
                    <p className="text-sm font-medium">
                      ₹{item.service?.selling_price || item.package?.price}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          disabled={items.length === 0}
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}