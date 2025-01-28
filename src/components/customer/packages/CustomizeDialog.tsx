import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ServicesList } from "./ServicesList";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCart } from "@/components/cart/CartContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { addToCart, items } = useCart();

  const handleBookNow = async () => {
    // Check if this package is already in cart
    const existingPackageInCart = items.find(item => 
      item.package_id === selectedPackage?.id
    );

    if (existingPackageInCart) {
      // Remove the existing package from cart (it will be handled by the CartContext)
      toast.success("Package updated in cart");
    }

    // Add the customized package to cart
    await addToCart(undefined, selectedPackage?.id);
    onOpenChange(false);
  };

  if (!selectedPackage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${isMobile ? 'max-w-full h-[90vh] mt-[5vh] rounded-t-lg' : 'max-w-2xl h-[90vh]'} flex flex-col p-0`}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Customize {selectedPackage?.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <ServicesList
              selectedPackage={selectedPackage}
              selectedServices={selectedServices}
              allServices={allServices}
              onServiceToggle={onServiceToggle}
            />
          </div>
        </ScrollArea>

        <div className="border-t bg-background p-4 mt-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedServices.length} services selected
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {totalDuration} min
                </div>
                <div className="text-2xl font-bold">
                  ₹{totalPrice}
                </div>
              </div>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleBookNow}
            >
              Book Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}