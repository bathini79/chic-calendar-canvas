
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ServicesList } from "./ServicesList";
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
  const { addToCart, removeFromCart, items } = useCart();
  // Find if this package is already in cart
  const existingPackageInCart = items.find(item => 
    item.package_id === selectedPackage?.id
  );

  // When dialog opens, initialize selected services from cart if package exists
  useEffect(() => {
    if (open && selectedPackage && existingPackageInCart) {
      // Reset all selections first
      selectedServices.forEach(id => onServiceToggle(id, false));
      
      // Add back the included services
      selectedPackage.package_services.forEach((ps: any) => {
        onServiceToggle(ps.service.id, true);
      });

      // Add any additional services that were previously selected
      if (existingPackageInCart.customized_services) {
        existingPackageInCart.customized_services.forEach((serviceId: string) => {
          onServiceToggle(serviceId, true);
        });
      }
    }
  }, [open, selectedPackage, existingPackageInCart]);

  const handleBookNow = async () => {
    try {
      if (existingPackageInCart) {
        // First remove the existing package from cart
        await removeFromCart(existingPackageInCart.id);
      }
      
      // Get additional services (exclude services already included in package)
      const additionalServices = selectedServices.filter(
        serviceId => !selectedPackage.package_services.some((ps: any) => ps.service.id === serviceId)
      );

      const cartItem = {
        customized_services: additionalServices,
        package_id: selectedPackage.id,
        selling_price: totalPrice  // This will be properly handled by CartContext now
      };

      // Add the package with updated customizations
      await addToCart(undefined, selectedPackage?.id, cartItem);
      
      toast.success(existingPackageInCart ? "Package updated in cart" : "Added to cart");
      onOpenChange(false);
    } catch (error) {
      console.error('Error handling package:', error);
      toast.error("Failed to update cart");
    }
  };

  if (!selectedPackage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl h-[90vh] flex flex-col p-0"
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
                {selectedServices.length} services selected • {totalDuration} min
              </div>
              <div className="text-2xl font-bold">
                ₹{totalPrice}
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
