
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
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Service, Package as PackageType } from "../types";
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

interface CheckoutSectionProps {
  appointmentId: string;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: PackageType[];
  discountType: "none" | "percentage" | "fixed";
  discountValue: number;
  paymentMethod: "cash" | "online";
  notes: string;
  onDiscountTypeChange: (value: "none" | "percentage" | "fixed") => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (value: "cash" | "online") => void;
  onNotesChange: (value: string) => void;
  onPaymentComplete: () => void;
  selectedStylists: { [key: string]: string };
  selectedTimeSlots: { [key: string]: string };
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  appointmentId,
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
}) => {
  const selectedItems = useMemo(
    () =>
      [
        ...selectedServices.map((id) => {
          const service = services.find((s) => s.id === id);
          return service
            ? {
                id,
                name: service.name,
                price: service.selling_price,
                duration: service.duration,
                type: "service" as const,
                stylist: selectedStylists[id],
                time: selectedTimeSlots?.[id],
              }
            : null;
        }),
        ...selectedPackages.map((id) => {
          const pkg = packages.find((p) => p.id === id);
          return pkg
            ? {
                id,
                name: pkg.name,
                price: pkg.price,
                duration: pkg.duration,
                type: "package" as const,
                stylist: selectedStylists[id],
                time: selectedTimeSlots?.[id],
              }
            : null;
        }),
      ].filter(Boolean),
    [selectedServices, selectedPackages, services, packages, selectedStylists, selectedTimeSlots]
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
    if (!appointmentId) {
      toast.error("Invalid appointment ID");
      return;
    }

    try {
      const { error: appointmentError } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          payment_method: paymentMethod,
          discount_type: discountType,
          discount_value: discountValue,
          total_price: total,
          notes: notes,
        })
        .eq("id", appointmentId);

      if (appointmentError) throw appointmentError;

      const { error: bookingsError } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("appointment_id", appointmentId);

      if (bookingsError) throw bookingsError;

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
          <h2 className="text-xl font-semibold mb-6">Checkout Summary</h2>
          <div className="flex-1 space-y-6">
            {/* Services List */}
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
                            {item.time} • {item.duration} mins
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
                    <p className="font-semibold text-lg">
                      <IndianRupee className="inline h-4 w-4" />
                      {item.price}
                    </p>
                  </div>
                )
              ))}
            </div>

            <Separator />

            {/* Pricing Summary */}
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

          {/* Bottom Section */}
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
                disabled={!appointmentId}
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
