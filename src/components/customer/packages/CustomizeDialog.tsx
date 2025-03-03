import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Plus, Check, Package } from "lucide-react";

interface CustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage: any;
  selectedServices: string[];
  allServices: any[];
  totalPrice: number;
  totalDuration: number;
  onServiceToggle: (serviceId: string, checked: boolean) => void;
  onAddCustomizedPackage: () => void;
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
  onAddCustomizedPackage,
}: CustomizeDialogProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
    }
    return `${minutes}m`;
  };

  useEffect(() => {
    // You can add any initialization logic here if needed
  }, [selectedPackage]);

  if (!selectedPackage) return null;

  const { name, description, price, is_customizable, customizable_services, package_services = [] } = selectedPackage;

  // Get ids of services included in the package
  const packageServiceIds = package_services.map(
    (ps: any) => ps.service?.id || ps.service_id
  );

  // Get available customizable services not already included in the package
  const availableCustomServices = allServices.filter(
    (service) =>
      customizable_services?.includes(service.id) &&
      !packageServiceIds.includes(service.id)
  );

  // Calculate the hours and minutes for duration display
  const hours = Math.floor(totalDuration / 60);
  const minutes = totalDuration % 60;
  const durationDisplay =
    hours > 0
      ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`
      : `${minutes}m`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize Your Package</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Package details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <h3 className="text-lg font-bold">{name}</h3>
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{durationDisplay}</span>
              </div>
              <span className="font-medium">₹{totalPrice}</span>
            </div>
          </div>

          {/* Included services */}
          <div>
            <h4 className="text-sm font-medium mb-2">Included Services</h4>
            <div className="flex flex-wrap gap-2">
              {package_services.map((ps: any) => {
                const service = ps.service;
                return (
                  <Badge
                    key={service.id}
                    variant="outline"
                    className="py-1.5 px-2.5"
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                    {service.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Additional services */}
          {is_customizable && availableCustomServices.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                Add Additional Services
              </h4>
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {availableCustomServices.map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            onServiceToggle(
                              service.id,
                              checked as boolean
                            )
                          }
                        />
                        <div>
                          <label
                            htmlFor={`service-${service.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {service.name}
                          </label>
                          <div className="flex text-xs text-muted-foreground gap-3 mt-0.5">
                            <span>
                              {formatDuration(service.duration)}
                            </span>
                            <span>₹{service.selling_price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="gap-1"
            onClick={() => {
              onAddCustomizedPackage();
              onOpenChange(false);
            }}
          >
            <Plus className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
