
import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ChevronLeft, CircleDollarSign, ClipboardList, PenSquare, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "./StatusBadge";
import useSaveAppointment from "../hooks/useSaveAppointment";
import { AppointmentStatus, DiscountType, PaymentMethod, Service, Package } from "../types";
import { toast } from "sonner";
import { getTotalPrice } from "../utils/bookingUtils";
import { formatPrice } from "@/lib/utils";

interface CheckoutSectionProps {
  appointmentId: string;
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: Array<Service>;
  packages: Array<Package>;
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  notes: string;
  onDiscountTypeChange: (type: DiscountType) => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onNotesChange: (notes: string) => void;
  onPaymentComplete: (appointmentId?: string) => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onSaveAppointment: () => Promise<string | undefined>;
  onRemoveService: (id: string) => void;
  onRemovePackage: (id: string) => void;
  onBackToServices: () => void;
  customizedServices: Record<string, string[]>;
  isExistingAppointment: boolean;
  locationId?: string;
  onCancelAppointment?: () => void;
  onMarkAsNoShow?: () => void;
  onMarkAsCompleted?: () => void;
  appointmentStatus?: AppointmentStatus;
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  appointmentId,
  selectedCustomer,
  selectedServices,
  selectedPackages,
  services,
  packages,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  onDiscountTypeChange,
  onDiscountValueChange,
  onPaymentMethodChange,
  onNotesChange,
  onPaymentComplete,
  selectedStylists,
  onSaveAppointment,
  onRemoveService,
  onRemovePackage,
  onBackToServices,
  customizedServices,
  isExistingAppointment,
  locationId,
  onCancelAppointment,
  onMarkAsNoShow,
  onMarkAsCompleted,
  appointmentStatus,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"details" | "payment">("details");

  const calculatedSubTotal = useMemo(() => {
    return getTotalPrice(
      selectedServices,
      selectedPackages,
      services,
      packages,
      customizedServices
    );
  }, [selectedServices, selectedPackages, services, packages, customizedServices]);

  // For simplified demo, just use a fixed tax rate
  const taxRate = 0.09; // 9% tax
  const taxAmount = calculatedSubTotal * taxRate;
  const totalAmount = calculatedSubTotal + taxAmount;

  const selectedServicesData = useMemo(() => {
    return services
      .filter((service) => selectedServices.includes(service.id))
      .map((service) => ({
        id: service.id,
        name: service.name,
        price: service.selling_price,
        duration: service.duration,
        stylist: selectedStylists[service.id]
          ? services.find((s) => s.id === service.id)?.name || "Staff"
          : "Staff",
      }));
  }, [selectedServices, services, selectedStylists]);

  const selectedPackagesData = useMemo(() => {
    const packagesWithAddOns = packages
      .filter((pkg) => selectedPackages.includes(pkg.id))
      .map((pkg) => {
        // Get the base package
        const basePackage = {
          id: pkg.id,
          name: pkg.name,
          price: pkg.price,
          duration: pkg.duration,
          stylist: selectedStylists[pkg.id]
            ? packages.find((p) => p.id === pkg.id)?.name || "Staff"
            : "Staff",
        };

        // Calculate additional services price and add them
        const customServices = customizedServices[pkg.id] || [];
        const addOnServices = services.filter((service) =>
          customServices.includes(service.id)
        );

        const totalAddOnPrice = addOnServices.reduce(
          (sum, service) => sum + service.selling_price,
          0
        );

        return {
          ...basePackage,
          price: pkg.price + totalAddOnPrice,
          addOnServices,
        };
      });

    return packagesWithAddOns;
  }, [selectedPackages, packages, selectedStylists, customizedServices, services]);

  const handleCompletePayment = async () => {
    setIsSaving(true);

    try {
      const appointmentId = await onSaveAppointment();

      if (appointmentId) {
        setTimeout(() => {
          onPaymentComplete(appointmentId);
          setIsSaving(false);
          toast.success("Payment completed successfully!");
        }, 1500);
      } else {
        setIsSaving(false);
        toast.error("Failed to save appointment");
      }
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
      setIsSaving(false);
    }
  };

  const handleChange = async () => {
    setIsSaving(true);

    try {
      const appointmentId = await onSaveAppointment();

      if (appointmentId) {
        toast.success("Appointment updated successfully!");
      } else {
        toast.error("Failed to update appointment");
      }
    } catch (error: any) {
      console.error("Error updating appointment:", error);
      toast.error(error.message || "Failed to update appointment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBackToServices} className="mr-2 p-0">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h3 className="text-lg font-semibold">Checkout</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {appointmentStatus && (
              <StatusBadge status={appointmentStatus} />
            )}
            
            {/* Action buttons removed from here */}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Services</h3>

          {selectedServicesData.length > 0 && (
            <div className="space-y-3">
              {selectedServicesData.map((service) => (
                <div
                  key={service.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted-foreground">
                      With {selectedStylists[service.id] || "Staff"}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="font-medium">{formatPrice(service.price)}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onRemoveService(service.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedPackagesData.length > 0 && (
            <div className="space-y-3">
              {selectedPackagesData.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-sm text-muted-foreground">
                        With {selectedStylists[pkg.id] || "Staff"}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="font-medium">{formatPrice(pkg.price)}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRemovePackage(pkg.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Show add-on services if any */}
                  {pkg.addOnServices && pkg.addOnServices.length > 0 && (
                    <div className="pl-4 border-l-2 border-gray-200 mt-2 space-y-1">
                      {pkg.addOnServices.map((service) => (
                        <div
                          key={service.id}
                          className="text-sm flex justify-between"
                        >
                          <span>{service.name} (Add-on)</span>
                          <span>{formatPrice(service.selling_price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(calculatedSubTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax (9%)</span>
              <span>{formatPrice(taxAmount)}</span>
            </div>

            {discountType !== "none" && (
              <div className="flex justify-between text-red-600">
                <span>
                  Discount
                  {discountType === "percentage"
                    ? ` (${discountValue}%)`
                    : ""}
                </span>
                <span>
                  -
                  {formatPrice(
                    discountType === "percentage"
                      ? (calculatedSubTotal * discountValue) / 100
                      : discountValue
                  )}
                </span>
              </div>
            )}

            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span>
              <span>
                {formatPrice(
                  totalAmount -
                    (discountType === "percentage"
                      ? (calculatedSubTotal * discountValue) / 100
                      : discountType === "fixed"
                      ? discountValue
                      : 0)
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t p-6 space-y-4">
        <div className="flex justify-between">
          <div className="space-x-2">
            {isExistingAppointment && (
              <>
                {onCancelAppointment && (
                  <Button variant="outline" onClick={onCancelAppointment}>
                    Cancel Appointment
                  </Button>
                )}
                {onMarkAsNoShow && (
                  <Button variant="outline" onClick={onMarkAsNoShow}>
                    Mark as No-Show
                  </Button>
                )}
                {onMarkAsCompleted && (
                  <Button variant="outline" onClick={onMarkAsCompleted}>
                    Mark as Completed
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isExistingAppointment ? (
              <Button
                className="bg-black text-white"
                disabled={isSaving}
                onClick={handleChange}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            ) : (
              <>
                <div className="flex space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <PenSquare className="h-4 w-4 mr-2" />
                        Options
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4">
                      <div className="space-y-4">
                        <h3 className="font-semibold">Payment Method</h3>
                        <div className="flex gap-4">
                          <Select
                            value={paymentMethod}
                            onValueChange={(value) => onPaymentMethodChange(value as PaymentMethod)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <h3 className="font-semibold">Discount</h3>
                        <div className="flex gap-4">
                          <Select
                            value={discountType}
                            onValueChange={(value) => onDiscountTypeChange(value as DiscountType)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Discount type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Discount</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>

                          {discountType !== "none" && (
                            <div className="flex-1">
                              <Input
                                type="number"
                                value={discountValue}
                                onChange={(e) => onDiscountValueChange(Number(e.target.value))}
                                min="0"
                                step={discountType === "percentage" ? "1" : "100"}
                                placeholder={discountType === "percentage" ? "%" : "₹"}
                              />
                            </div>
                          )}
                        </div>
                        
                        <h3 className="font-semibold">Notes</h3>
                        <Textarea
                          value={notes}
                          onChange={(e) => onNotesChange(e.target.value)}
                          placeholder="Add notes about this appointment"
                          className="min-h-20"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    className="bg-black text-white"
                    disabled={isSaving}
                    onClick={handleCompletePayment}
                  >
                    {isSaving ? "Processing..." : "Complete Payment"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
