import { useCart } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function BookingSummary() {
  const { items } = useCart();
  const navigate = useNavigate();

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + (item.service?.selling_price || item.package?.price || 0);
    }, 0);
  };

  const handleConfirm = () => {
    // This will be implemented later with the booking logic
    toast.success("Booking confirmed!");
    navigate("/");
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between">
            <span>{item.service?.name || item.package?.name}</span>
            <span>₹{item.service?.selling_price || item.package?.price}</span>
          </div>
        ))}
        <div className="border-t pt-4">
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>₹{calculateTotal()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleConfirm}>
          Confirm Booking
        </Button>
      </CardFooter>
    </Card>
  );
}