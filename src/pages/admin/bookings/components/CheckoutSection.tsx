
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MoreVertical, 
  IndianRupee, 
  Percent, 
  Clock,
  User,
  Plus,
  ArrowLeft,
  Trash2,
  Package
} from "lucide-react";
import { toast } from "sonner";
import type { Service, Package as PackageType, Customer } from "../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { getTotalPrice, getTotalDuration, getFinalPrice } from "../utils/bookingUtils";

interface CheckoutSectionProps {
  appointmentId?: string;
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: PackageType[];
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  paymentMethod: 'cash' | 'online';
  notes: string;
  onDiscountTypeChange: (type: 'none' | 'percentage' | 'fixed') => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: 'cash' | 'online') => void;
  onNotesChange: (notes: string) => void;
  onPaymentComplete: (appointmentId?: string) => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onSaveAppointment: () => Promise<string | null>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  onBackToServices: () => void;
  isExistingAppointment?: boolean;
  customizedServices?: Record<string, string[]>;
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
  selectedTimeSlots,
  onSaveAppointment,
  onRemoveService,
  onRemovePackage,
  onBackToServices,
  isExistingAppointment,
  customizedServices = {}
}) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
    }
    return `${minutes}m`;
  };

  const formatTimeSlot = (timeString: string) => {
    try {
      const baseDate = new Date();
      const [hours, minutes] = timeString.split(':').map(Number);
      baseDate.setHours(hours, minutes);
      return format(baseDate, 'hh:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  const subtotal = useMemo(() => 
    getTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices),
    [selectedServices, selectedPackages, services, packages, customizedServices]
  );

  const totalDuration = useMemo(() => 
    getTotalDuration(selectedServices, selectedPackages, services, packages, customizedServices),
    [selectedServices, selectedPackages, services, packages, customizedServices]
  );

  const total = useMemo(() => 
    getFinalPrice(subtotal, discountType, discountValue),
    [subtotal, discountType, discountValue]
  );

  const discountAmount = useMemo(() => 
    subtotal - total,
    [subtotal, total]
  );

  // Group bookings into packages and standalone services
  const groupedItems = useMemo(() => {
    const packageGroups: Record<string, {
      package: PackageType;
      services: Service[];
      stylist: string;
      time: string;
    }> = {};
    
    // First pass: Initialize package groups with their details
    selectedPackages.forEach(packageId => {
      const pkg = packages.find(p => p.id === packageId);
      if (!pkg) return;
      
      packageGroups[packageId] = {
        package: pkg,
        services: [],
        stylist: selectedStylists[packageId] || '',
        time: selectedTimeSlots[packageId] || selectedTimeSlots[appointmentId || ''] || '',
      };
    });
    
    // Second pass: Populate services within each package
    selectedPackages.forEach(packageId => {
      const pkg = packages.find(p => p.id === packageId);
      if (!pkg || !packageGroups[packageId]) return;
      
      // Add default package services first
      if (pkg.package_services) {
        pkg.package_services.forEach(ps => {
          if (ps.service && !packageGroups[packageId].services.some(s => s.id === ps.service.id)) {
            packageGroups[packageId].services.push(ps.service);
          }
        });
      }
      
      // Add customized services if available
      if (customizedServices[packageId]) {
        customizedServices[packageId].forEach(serviceId => {
          const service = services.find(s => s.id === serviceId);
          // Only add if not already included and exists
          if (service && !packageGroups[packageId].services.some(s => s.id === serviceId)) {
            packageGroups[packageId].services.push(service);
          }
        });
      }
    });
    
    // Collect all service IDs that are part of packages
    const packageServiceIds = new Set<string>();
    Object.values(packageGroups).forEach(group => {
      group.services.forEach(service => {
        packageServiceIds.add(service.id);
      });
    });
    
    // Filter out standalone services (not part of any package)
    const standaloneServices = selectedServices
      .filter(id => !packageServiceIds.has(id))
      .map(id => {
        const service = services.find(s => s.id === id);
        return service ? {
          service,
          stylist: selectedStylists[id] || '',
          time: selectedTimeSlots[id] || selectedTimeSlots[appointmentId || ''] || '',
        } : null;
      })
      .filter(Boolean) as {
        service: Service;
        stylist: string;
        time: string;
      }[];
    
    return {
      packageGroups,
      standaloneServices,
    };
  }, [
    selectedServices, 
    selectedPackages, 
    services, 
    packages, 
    selectedStylists, 
    selectedTimeSlots, 
    appointmentId, 
    customizedServices
  ]);

  const handlePayment = async () => {
    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }
      const savedAppointmentId = await onSaveAppointment();
      if (!savedAppointmentId) {
        toast.error("Failed to complete payment");
        return;
      }

      toast.success("Payment completed successfully");
      onPaymentComplete(savedAppointmentId);
    } catch (error: any) {
      console.error("Error completing payment:", error);
      toast.error(error.message || "Failed to complete payment");
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 p-6">
      <Card className="h-full">
        <CardContent className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Checkout Summary</h2>
            <Button
              variant="outline"
              onClick={onBackToServices}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </div>

          <div className="flex-1 space-y-6">
            {(Object.keys(groupedItems.packageGroups).length === 0 && groupedItems.standaloneServices.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-muted-foreground text-center">
                  No services or packages selected
                </p>
                <Button
                  variant="default"
                  onClick={onBackToServices}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go to Services
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Display packages with their services grouped underneath */}
                {Object.entries(groupedItems.packageGroups).map(([packageId, packageGroup]) => (
                  <div
                    key={`package-${packageId}`}
                    className="border rounded-md p-4 mb-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center">
                          <Package className="mr-2 h-4 w-4 text-blue-500" />
                          <h3 className="text-lg font-semibold tracking-tight text-blue-600">
                            {packageGroup.package.name}
                          </h3>
                        </div>
                        <div className="flex flex-col mt-2 text-sm text-muted-foreground">
                          {packageGroup.time && (
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4" />
                              <span>
                                {formatTimeSlot(packageGroup.time)} • 
                                {formatDuration(getTotalDuration([], [packageId], services, packages, customizedServices))}
                              </span>
                            </div>
                          )}
                          {packageGroup.stylist && (
                            <div className="flex items-center mt-1">
                              <User className="mr-2 h-4 w-4" />
                              <span>{packageGroup.stylist}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-lg">
                          <IndianRupee className="inline h-4 w-4" />
                          {getTotalPrice([], [packageId], services, packages, customizedServices)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onRemovePackage(packageId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Display services in this package */}
                    <div className="pl-6 mt-3 space-y-2 border-l-2 border-blue-200">
                      {packageGroup.services.map((service) => (
                        <div key={`package-service-${service.id}`} className="flex justify-between items-center py-1">
                          <div>
                            <p className="text-sm font-medium">{service.name}</p>
                            <p className="text-xs text-gray-500">{service.duration}min</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Display standalone services */}
                {groupedItems.standaloneServices.map((item) => (
                  <div
                    key={`service-${item.service.id}`}
                    className="flex items-center justify-between py-4 border-b border-gray-100"
                  >
                    <div className="space-y-2">
                      <p className="text-lg font-semibold tracking-tight">{item.service.name}</p>
                      <div className="space-y-1">
                        <div className="flex flex-col text-sm text-muted-foreground gap-1">
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            {item.time && (
                              <span>
                                {formatTimeSlot(item.time)} • {formatDuration(item.service.duration)}
                              </span>
                            )}
                            {!item.time && (
                              <span>{formatDuration(item.service.duration)}</span>
                            )}
                          </div>
                          {item.stylist && (
                            <div className="flex items-center">
                              <User className="mr-2 h-4 w-4" />
                              {item.stylist}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-lg">
                        <IndianRupee className="inline h-4 w-4" />
                        {item.service.selling_price}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onRemoveService(item.service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              {discountType !== "none" && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center">
                    <Percent className="mr-2 h-4 w-4" />
                    Discount
                    {discountType === "percentage" && ` (${discountValue}%)`}
                  </span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Payment Method</h4>
              <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                size="lg"
                onClick={handlePayment}
                disabled={Object.keys(groupedItems.packageGroups).length === 0 && groupedItems.standaloneServices.length === 0}
              >
                Complete Payment
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="lg">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Discount</h3>
                    <div className="flex gap-4">
                      <Select
                        value={discountType}
                        onValueChange={onDiscountTypeChange}
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
                        <Input
                          type="number"
                          placeholder={
                            discountType === "percentage"
                              ? "Enter %"
                              : "Enter amount"
                          }
                          value={discountValue}
                          onChange={(e) =>
                            onDiscountValueChange(Number(e.target.value))
                          }
                          className="w-24"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Notes</h3>
                      <Textarea
                        placeholder="Add appointment notes..."
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
