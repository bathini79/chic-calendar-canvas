
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { toast } from "sonner";

export interface CustomizeDialogProps {
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
  onServiceToggle
}: CustomizeDialogProps) {
  const { addToCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!selectedPackage) return null;

  const includedServiceIds = selectedPackage.package_services?.map((ps: any) => ps.service.id) || [];
  const customizableServiceIds = selectedPackage.customizable_services || [];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Filter out included services from the custom selections
      const customSelections = selectedServices.filter(
        id => !includedServiceIds.includes(id) && customizableServiceIds.includes(id)
      );
      
      await addToCart(undefined, selectedPackage.id, customSelections);
      onOpenChange(false);
      toast.success("Package added to cart");
    } catch (error) {
      console.error("Error adding customized package:", error);
      toast.error("Failed to add package to cart");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableServices = allServices?.filter(
    service => customizableServiceIds.includes(service.id) && !includedServiceIds.includes(service.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize {selectedPackage.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <h3 className="text-sm font-medium mb-3">Included Services</h3>
          <div className="space-y-2 mb-6">
            {selectedPackage.package_services?.map((ps: any) => (
              <div key={ps.service.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{ps.service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ps.service.duration} min
                  </p>
                </div>
                <Checkbox checked disabled />
              </div>
            ))}
          </div>

          {availableServices && availableServices.length > 0 && (
            <>
              <h3 className="text-sm font-medium mb-3">Additional Services</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {availableServices.map((service: any) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <div className="flex justify-between">
                        <p className="text-sm text-muted-foreground">
                          {service.duration} min
                        </p>
                        <p className="text-sm font-medium ml-6">
                          ₹{service.selling_price}
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={(checked) => 
                        onServiceToggle(service.id, checked === true)
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="border-t mt-6 pt-4">
            <div className="flex justify-between mb-2">
              <span>Total Duration:</span>
              <span>{totalDuration} min</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total Price:</span>
              <span>₹{totalPrice}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add to Cart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
