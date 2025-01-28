import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ServicesList } from "./ServicesList";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCart } from "@/components/cart/CartContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect } from "react";

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
  const { addToCart, removeFromCart, items } = useCart();

  // Initialize selected services when dialog opens
  useEffect(() => {
    if (open && selectedPackage) {
      // Find if this package is already in cart
      const existingPackageInCart = items.find(item => 
        item.package_id === selectedPackage?.id
      );

      if (existingPackageInCart) {
        // Reset selected services to match what's in the cart
        const includedServiceIds = selectedPackage.package_services.map((ps: any) => ps.service.id);
        onServiceToggle('reset', false); // Reset all selections
        includedServiceIds.forEach(id => onServiceToggle(id, true));
      }
    }
  }, [open, selectedPackage, items]);

  const handleBookNow = async () => {
    // Check if this package is already in cart
    const existingPackageInCart = items.find(item => 
      item.package_id === selectedPackage?.id
    );

    if (existingPackageInCart) {
      // First remove the existing package from cart
      await removeFromCart(existingPackageInCart.id);
      // Then add the updated package
      await addToCart(undefined, selectedPackage?.id);
      toast.success("Package updated in cart");
    } else {
      // Add the new customized package to cart
      await addToCart(undefined, selectedPackage?.id);
      toast.success("Added to cart");
    }
    
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