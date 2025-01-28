import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign } from "lucide-react";
import { ServicesList } from "./ServicesList";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@/hooks/use-mobile";

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
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!selectedPackage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${isMobile ? 'max-w-full h-[90vh] mt-auto translate-y-0 rounded-b-none' : 'max-w-2xl'}`}
      >
        <DialogHeader>
          <DialogTitle>Customize {selectedPackage?.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className={`${isMobile ? 'flex-1' : 'max-h-[60vh]'}`}>
          <ServicesList
            selectedPackage={selectedPackage}
            selectedServices={selectedServices}
            allServices={allServices}
            onServiceToggle={onServiceToggle}
          />
        </ScrollArea>
        <div className="space-y-4 pt-4 border-t">
          <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex justify-between items-center'}`}>
            <div className={`${isMobile ? 'grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg' : 'space-y-1'}`}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{totalDuration} min</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>₹{totalPrice}</span>
              </div>
            </div>
            <Button 
              className="w-full" 
              onClick={() => {
                navigate(`/book/package/${selectedPackage?.id}?customize=true&services=${selectedServices.join(',')}`);
                onOpenChange(false);
              }}
            >
              Continue Booking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}