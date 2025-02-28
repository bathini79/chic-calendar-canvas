import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ServicesList } from "./ServicesList";
import { useCart } from "@/components/cart/CartContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { calculatePackagePrice, calculatePackageDuration } from "@/pages/admin/bookings/utils/bookingUtils";

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
  onServiceToggle,
}: CustomizeDialogProps) {
  const { addToCart, removeFromCart, items } = useCart();
  const [localServices, setLocalServices] = useState<any[]>([]);
  
  // Find if this package is already in cart
  const existingPackageInCart = items.find(item => 
    item.package_id === selectedPackage?.id
  );

  useEffect(() => {
    if (allServices) {
      setLocalServices(allServices);
    }
  }, [allServices]);
  
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

      // Calculate the base package duration from package services
      const basePackageDuration = selectedPackage?.package_services?.reduce(
        (total: number, ps: any) => total + ps.service.duration, 0
      ) || 0;

      // Calculate additional duration from customized services
      const additionalDuration = additionalServices.reduce((total: number, serviceId: string) => {
        const service = localServices?.find(s => s.id === serviceId);
        return total + (service?.duration || 0);
      }, 0);

      // Total duration is base package duration plus additional services duration
      const calculatedDuration = basePackageDuration + additionalDuration;

      // Calculate price
      const calculatedPrice = calculatePackagePrice(selectedPackage, additionalServices, localServices);

      // Add the package with updated customizations
      await addToCart(undefined, selectedPackage?.id, {
        customized_services: additionalServices,
        selling_price: calculatedPrice,
        duration: calculatedDuration
      });
      
      toast.success(existingPackageInCart ? "Package updated in cart" : "Added to cart");
      onOpenChange(false);
    } catch (error) {
      console.error('Error handling package:', error);
      toast.error("Failed to update cart");
    }
  };

  // Calculate total price and duration
  const additionalServices = selectedServices.filter(
    serviceId => !selectedPackage?.package_services.some((ps: any) => ps.service.id === serviceId)
  );

  // Calculate the base package duration from package services
  const basePackageDuration = selectedPackage?.package_services?.reduce(
    (total: number, ps: any) => total + ps.service.duration, 0
  ) || 0;

  // Calculate additional duration from customized services
  const additionalDuration = additionalServices.reduce((total: number, serviceId: string) => {
    const service = localServices?.find(s => s.id === serviceId);
    return total + (service?.duration || 0);
  }, 0);

  // Total duration is base package duration plus additional services duration
  const totalDuration = basePackageDuration + additionalDuration;

  // Calculate total price using the utility function
  const totalPrice = calculatePackagePrice(selectedPackage, additionalServices, localServices);

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
              allServices={localServices}
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