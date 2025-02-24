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
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import type { Service, Package } from "../types";
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

interface Customer {
  id: string;
}

interface CheckoutSectionProps {
  appointmentId?: string;
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  paymentMethod: 'cash' | 'online';
  notes: string;
  onDiscountTypeChange: (type: 'none' | 'percentage' | 'fixed') => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: 'cash' | 'online') => void;
  onNotesChange: (notes: string) => void;
  onPaymentComplete: () => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onSaveAppointment: () => Promise<string | null>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  onBackToServices: () => void;
  isExistingAppointment?: boolean;
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
  isExistingAppointment
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

  const selectedItems = useMemo(
    () =>
      [
        ...selectedServices.map((id) => {
          const service = services.find((s) => s.id === id);
          const stylist = selectedStylists[id];
          const timeSlot = selectedTimeSlots[id] || selectedTimeSlots[appointmentId || ''];
          return service
            ? {
                id,
                name: service.name,
                price: service.selling_price,
                duration: service.duration,
                type: "service" as const,
                stylist,
                time: timeSlot ? formatTimeSlot(timeSlot) : undefined,
                formattedDuration: formatDuration(service.duration),
              }
            : null;
        }),
        ...selectedPackages.map((id) => {
          const pkg = packages.find((p) => p.id === id);
          const stylist = selectedStylists[id];
          const timeSlot = selectedTimeSlots[id] || selectedTimeSlots[appointmentId || ''];
          return pkg
            ? {
                id,
                name: pkg.name,
                price: pkg.price,
                duration: pkg.duration || 0,
                type: "package" as const,
                stylist,
                time: timeSlot ? formatTimeSlot(timeSlot) : undefined,
                formattedDuration: formatDuration(pkg.duration || 0),
              }
            : null;
        }),
      ].filter(Boolean),
    [selectedServices, selectedPackages, services, packages, selectedStylists, selectedTimeSlots, appointmentId]
  );

  const subtotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + (item?.price || 0), 0),
    [selectedItems]
  );

  const discountAmount = useMemo(
    () =>
      discountType === "percentage"
        ? (subtotal * discountValue) / 100
        : discountType === "fixed"
        ? discountValue
        : 0,
    [discountType, discountValue, subtotal]
  );

  const total = useMemo(
    () => subtotal - discountAmount,
    [subtotal, discountAmount]
  );

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
      onPaymentComplete();
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
            {selectedItems.length === 0 ? (
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
              <div className="space-y-4">
                {selectedItems.map((item) => (
                  item && (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center justify-between py-4 border-b border-gray-100"
                    >
                      <div className="space-y-2">
                        <p className="text-lg font-semibold tracking-tight">{item.name}</p>
                        <div className="space-y-1">
                          <div className="flex flex-col text-sm text-muted-foreground gap-1">
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4" />
                              {item.time && (
                                <span>{item.time} • {item.formattedDuration}</span>
                              )}
                              {!item.time && (
                                <span>{item.formattedDuration}</span>
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
                          {item.price}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (item.type === 'service') {
                              onRemoveService(item.id);
                            } else {
                              onRemovePackage(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
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
                disabled={selectedItems.length === 0}
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
