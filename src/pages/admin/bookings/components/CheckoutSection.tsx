
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
import { ClipboardList, Percent, FileEdit, Package, EllipsisVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Service, Package as PackageType } from "../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
                type: "service" as const,
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
                type: "package" as const,
              }
            : null;
        }),
      ].filter(Boolean),
    [selectedServices, selectedPackages, services, packages]
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

  const handleClearDiscount = () => {
    onDiscountTypeChange("none");
    onDiscountValueChange(0);
  };

  return (
    <div className="flex w-full h-full pb-8">
      <div className="w-3/4 p-4 bg-gray-50 border-r flex flex-col h-full">
        {/* Combined Items List and Calculation Section */}
        <div className="overflow-y-auto flex-grow">
          <div className="space-y-4">
            {/* Title */}
            <div className="flex items-center">
              <ClipboardList className="mr-2 h-5 w-5 inline-block align-text-bottom" />
              <h2 className="text-lg font-semibold">Checkout Summary</h2>
            </div>
            {/* Items */}
            <div className="pt-6 space-y-4">
              {selectedItems.map(
                (item) =>
                  item && (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex justify-between items-center"
                    >
                      <div className="flex items-center">
                        {item.type === "package" ? (
                          <Package className="mr-2 h-4 w-4 text-blue-500" />
                        ) : (
                          <FileEdit className="mr-2 h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-medium">₹{item.price}</span>
                    </div>
                  )
              )}
            </div>
          </div>
        </div>

        {/* Subtotal, Discount, Total */}
        <div className=" border-t mt-4">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          {discountType !== "none" && (
            <div className="flex justify-between text-sm text-green-600 flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Discount
              </div>
              <span className="flex items-center gap-2">
                -₹{discountAmount}
                <button onClick={handleClearDiscount} className="text-red-500 hover:text-red-700 text-xs">
                  (Clear)
                </button>
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold mt-2">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>
        {/* Payment section */}
        <div className="flex flex-col justify-end mt-4">
          <div className="flex gap-4 ">
            <Popover>
              <PopoverTrigger asChild>
                <Button className="w-[20%]" variant="outline" size="lg">
                  <EllipsisVertical className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h3 className="font-semibold">Discount</h3>
                  <div className="flex gap-4 items-center">
                    <div className="w-1/2">
                      <Select
                        value={discountType}
                        onValueChange={onDiscountTypeChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select discount type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Discount</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {discountType !== "none" && (
                      <div className="w-1/2">
                        <Input
                          type="number"
                          placeholder={
                            discountType === "percentage"
                              ? "Enter percentage"
                              : "Enter amount"
                          }
                          value={discountValue}
                          onChange={(e) =>
                            onDiscountValueChange(Number(e.target.value))
                          }
                          min={0}
                          max={discountType === "percentage" ? 100 : undefined}
                        />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold">Notes</h3>
                  <Textarea
                    placeholder="Add any notes about this sale..."
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    rows={4}
                  />
                </div>
              </PopoverContent>
            </Popover>
            <Button
              className="w-full p-4"
              size="lg"
              onClick={handlePayment}
              disabled={!appointmentId}
            >
              Complete Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
