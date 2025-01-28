import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface BookingSummaryProps {
  items: any[];
  selectedDate: Date | null;
  selectedTimeSlots: Record<string, string>;
  selectedStylists: Record<string, string>;
}

export function BookingSummary({ 
  items, 
  selectedDate, 
  selectedTimeSlots, 
  selectedStylists 
}: BookingSummaryProps) {
  const navigate = useNavigate();

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + (item.service?.selling_price || item.package?.price || 0);
    }, 0);
  };

  const handleConfirm = () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    const unscheduledItems = items.filter(item => !selectedTimeSlots[item.id]);
    if (unscheduledItems.length > 0) {
      toast.error("Please select time slots for all services");
      return;
    }

    const unstylistedItems = items.filter(item => !selectedStylists[item.id]);
    if (unstylistedItems.length > 0) {
      toast.error("Please select stylists for all services");
      return;
    }

    // TODO: Implement booking confirmation
    toast.success("Booking confirmed!");
    navigate("/");
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedDate && (
          <p className="text-sm text-muted-foreground">
            Date: {format(selectedDate, "MMMM d, yyyy")}
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex justify-between">
              <span>{item.service?.name || item.package?.name}</span>
              <span>${item.service?.selling_price || item.package?.price}</span>
            </div>
          </div>
        ))}
        <div className="border-t pt-4">
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>${calculateTotal()}</span>
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