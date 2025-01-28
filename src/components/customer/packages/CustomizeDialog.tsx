import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign } from "lucide-react";
import { ServicesList } from "./ServicesList";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  if (!selectedPackage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${isMobile ? 'max-w-full h-[90vh] mt-auto translate-y-0 rounded-b-none' : 'max-w-2xl'} flex flex-col`}
      >
        <DialogHeader>
          <DialogTitle>Customize {selectedPackage?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center gap-4 p-4 border-b">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{totalDuration} min</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>₹{totalPrice}</span>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <ServicesList
            selectedPackage={selectedPackage}
            selectedServices={selectedServices}
            allServices={allServices}
            onServiceToggle={onServiceToggle}
          />
        </ScrollArea>

        <div className="border-t p-4 mt-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-medium">Total</span>
            <span className="text-2xl font-bold">₹{totalPrice}</span>
          </div>
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => {
              navigate(`/book/package/${selectedPackage?.id}?customize=true&services=${selectedServices.join(',')}`);
              onOpenChange(false);
            }}
          >
            Book Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}