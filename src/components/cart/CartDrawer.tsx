import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "./CartContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items, removeFromCart } = useCart();
  const navigate = useNavigate();

  const handleContinue = () => {
    onOpenChange(false); // Close the drawer
    navigate('/schedule'); // Navigate to scheduling page
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          <div className="space-y-4 mt-4">
            {items.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Your cart is empty
              </p>
            ) : (
              <>
                {items.map((item) => (
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
                          ${item.service?.selling_price || item.package?.price}
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
                ))}
                <Button 
                  className="w-full mt-4" 
                  onClick={handleContinue}
                >
                  Continue
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}