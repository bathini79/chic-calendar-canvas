
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ServicesList } from "./ServicesList";
import { formatPrice } from "@/lib/utils";

export interface CustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage: any;
  selectedServices: string[];
  allServices: any[];
  totalPrice: number;
  totalDuration: number;
  onServiceToggle: (serviceId: string, checked: boolean) => void;
  onConfirm: () => void;
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
  onConfirm
}: CustomizeDialogProps) {
  if (!selectedPackage) return null;

  const baseServiceIds = selectedPackage.package_services.map((ps: any) => ps.service.id);
  const hasCustomServices = selectedServices.some(id => !baseServiceIds.includes(id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize {selectedPackage.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Included Services</h3>
              <div className="space-y-2">
                {selectedPackage.package_services.map((ps: any) => (
                  <div
                    key={ps.service.id}
                    className="flex justify-between p-2 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">{ps.service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {ps.service.duration} min
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(ps.package_selling_price || ps.service.selling_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Add More Services</h3>
              <ServicesList
                services={allServices}
                selectedServices={selectedServices}
                onServiceToggle={onServiceToggle}
                packageServices={selectedPackage.package_services}
              />
            </div>
          </div>
        </div>

        <div className="bg-muted/20 p-4 rounded-md mt-4">
          <div className="flex justify-between mb-2">
            <span>Original Price</span>
            <span>{formatPrice(selectedPackage.price)}</span>
          </div>
          {hasCustomServices && (
            <div className="flex justify-between mb-2 text-green-600">
              <span>Added Services</span>
              <span>+{formatPrice(totalPrice - selectedPackage.price)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          <div className="text-sm text-muted-foreground text-right">
            Total Duration: {totalDuration} min
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
