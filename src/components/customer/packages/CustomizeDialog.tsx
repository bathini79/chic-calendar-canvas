import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign } from "lucide-react";
import { ServicesList } from "./ServicesList";
import { useNavigate } from "react-router-dom";

interface CustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage: any;
  selectedServices: string[];
  allServices: any[];
  totalPrice: number;
  totalDuration: number;
  onServiceToggle: (serviceId: string, checked: boolean) => void;
}

export function CustomizeDialog({
  open,
  onOpenChange,
  selectedPackage,
  selectedServices,
  allServices,
  totalPrice,
  totalDuration,
  onServiceToggle,
}: CustomizeDialogProps) {
  const navigate = useNavigate();

  if (!selectedPackage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize {selectedPackage?.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <ServicesList
            selectedPackage={selectedPackage}
            selectedServices={selectedServices}
            allServices={allServices}
            onServiceToggle={onServiceToggle}
          />
        </ScrollArea>
        <div className="space-y-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Total Duration: {totalDuration} min</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Total Price: ₹{totalPrice}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                navigate(`/book/package/${selectedPackage?.id}?customize=true&services=${selectedServices.join(',')}`);
                onOpenChange(false);
              }}>
                Continue Booking
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}