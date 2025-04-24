import React, { useMemo, useState, useEffect, useRef } from "react";
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
  Percent,
  Plus,
  ArrowLeft,
  Award,
  LoaderCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type { Service, Package, Customer } from "../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import {
  getTotalPrice,
  getTotalDuration,
  getFinalPrice,
  calculatePackagePrice,
  getAdjustedServicePrices,
} from "../utils/bookingUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SelectedItem } from './SelectedItem';
import LoyaltyPointsSection from "./LoyaltyPointsSection";
import { useLoyaltyInCheckout } from "../hooks/useLoyaltyInCheckout";
import { useMembershipInCheckout } from "../hooks/useMembershipInCheckout";
import { useCouponsInCheckout } from "../hooks/useCouponsInCheckout";
import { useTaxesInCheckout } from "../hooks/useTaxesInCheckout";
import { useSelectedItemsInCheckout } from '../hooks/useSelectedItemsInCheckout';
import { usePaymentHandler } from '../hooks/usePaymentHandler';
import { formatPrice } from "@/lib/utils";

interface CheckoutSectionProps {
  appointmentId?: string;
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  discountType: "none" | "percentage" | "fixed";
  discountValue: number;
  paymentMethod: "cash" | "online";
  notes: string;
  onDiscountTypeChange: (type: "none" | "percentage" | "fixed") => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: "cash" | "online") => void;
  onNotesChange: (notes: string) => void;
  onPaymentComplete: (appointmentId?: string) => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onSaveAppointment: (params?: any) => Promise<string | null>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  onBackToServices: () => void;
  isExistingAppointment?: boolean;
  customizedServices?: Record<string, string[]>;
  locationId?: string;
  loadingPayment?: boolean;
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
  customizedServices = {},
  locationId,
  loadingPayment = false,
}) => {
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("employment_type", "stylist");

      if (error) throw error;
      return data;
    },
  });

  const membership = useMembershipInCheckout({
    selectedCustomer,
    selectedServices,
    selectedPackages,
    services,
    packages,
    customizedServices,
  });

  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } =
    useQuery({
      queryKey: ["payment-methods"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("payment_methods")
          .select("*")
          .eq("is_enabled", true)
          .order("name");

        if (error) throw error;
        return data;
      },
    });

  const subtotal = useMemo(
    () =>
      getTotalPrice(
        selectedServices,
        selectedPackages,
        services || [],
        packages || [],
        customizedServices
      ),
    [selectedServices, selectedPackages, services, packages, customizedServices]
  );

  const coupons = useCouponsInCheckout({
    subtotal,
  });

  const discountedSubtotal = useMemo(() => {
    const regularDiscountedPrice = getFinalPrice(
      subtotal,
      discountType,
      discountValue
    );
    const afterMembershipDiscount = Math.max(
      0,
      regularDiscountedPrice - membership.membershipDiscount
    );

    return coupons.couponDiscount > 0
      ? Math.max(0, afterMembershipDiscount - coupons.couponDiscount)
      : afterMembershipDiscount;
  }, [
    subtotal,
    discountType,
    discountValue,
    membership.membershipDiscount,
    coupons.couponDiscount,
  ]);

  const loyalty = useLoyaltyInCheckout({
    customerId: selectedCustomer?.id,
    selectedServices,
    selectedPackages,
    services: services || [],
    packages: packages || [],
    subtotal,
    discountedSubtotal
  });

  const taxes = useTaxesInCheckout({
    locationId,
    discountedSubtotal
  });

  const getStylistName = (stylistId: string) => {
    if (!employees || !stylistId) return null;
    const stylist = employees.find((emp) => emp.id === stylistId);
    return stylist ? stylist.name : null;
  };

  const total = useMemo(
    () => Math.max(0, discountedSubtotal + taxes.taxAmount - loyalty.pointsDiscountAmount),
    [discountedSubtotal, taxes.taxAmount, loyalty.pointsDiscountAmount]
  );

  const roundedTotal = useMemo(() => {
    return Math.round(total);
  }, [total]);

  const roundOffDifference = useMemo(() => {
    return roundedTotal - total;
  }, [roundedTotal, total]);

  const adjustedPrices = useMemo(() => {
    return getAdjustedServicePrices(
      selectedServices,
      selectedPackages,
      services,
      packages,
      customizedServices,
      discountType,
      discountValue,
      membership.membershipDiscount,
      coupons.couponDiscount,
      0 // Don't include loyalty points in individual price adjustments
    );
  }, [
    selectedServices,
    selectedPackages,
    services,
    packages,
    customizedServices,
    discountType,
    discountValue,
    membership.membershipDiscount,
    coupons.couponDiscount
  ]);
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
    }
    return `${minutes}m`;
  };
  const getServiceDisplayPrice = (serviceId: string) => {
    return adjustedPrices[serviceId] !== undefined
      ? adjustedPrices[serviceId]
      : services?.find((s) => s.id === serviceId)?.selling_price || 0;
  };

  const { selectedItems } = useSelectedItemsInCheckout({
    selectedServices,
    selectedPackages,
    services,
    packages,
    selectedStylists,
    selectedTimeSlots,
    appointmentId,
    customizedServices,
    getServiceDisplayPrice,
    getStylistName,
    formatDuration,
  });

  const { handlePayment } = usePaymentHandler({
    selectedCustomer,
    paymentMethod,
    appointmentId,
    taxes: {
      appliedTaxId: taxes.appliedTaxId,
      taxAmount: taxes.taxAmount,
    },
    coupons: {
      selectedCouponId: coupons.selectedCouponId,
      couponDiscount: coupons.couponDiscount,
      availableCoupons: coupons.availableCoupons,
    },
    membership: {
      membershipId: membership.membershipId,
      membershipName: membership.membershipName,
      membershipDiscount: membership.membershipDiscount,
    },
    loyalty: {
      adjustedServicePrices: loyalty.adjustedServicePrices,
      pointsToEarn: loyalty.pointsToEarn,
      pointsToRedeem: loyalty.pointsToRedeem,
      pointsDiscountAmount: loyalty.pointsDiscountAmount,
    },
    total,
    adjustedPrices,
    onSaveAppointment,
    onPaymentComplete,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [selectedItems, subtotal, total]);

  return (
    <div className="h-full w-full bg-gray-50">
      <Card className="h-[calc(100vh-100px)] overflow-hidden flex flex-col">
        <CardContent className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
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

           {/* Main scrollable content area - all items and discount details */}
          <div className="flex-1 overflow-y-auto pr-2 min-h-0 mb-4">
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
              <div className="space-y-6 flex flex-col justify-between min-h-[calc(100vh-350px)]">
                <div className="space-y-4">
                  {selectedItems.map((item) => (
                    <SelectedItem
                      key={`${item.type}-${item.id}`}
                      item={item}
                      onRemove={() => {
                        if (item.type === "service") {
                          onRemoveService(item.id);
                        } else {
                          onRemovePackage(item.id);
                        }
                      }}
                    />
                  ))}
                </div>

                <div className="pt-4 space-y-3 mt-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>

                  {membership.membershipDiscount > 0 && membership.membershipName && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center">
                        <Award className="mr-2 h-4 w-4" />
                        Membership ({membership.membershipName})
                      </span>
                      <span>-₹{membership.membershipDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Show minimum billing amount warning */}
                  {selectedCustomer && membership.customerMemberships?.length > 0 && subtotal > 0 && !membership.membershipDiscount && (
                    <div className="flex justify-between text-sm text-yellow-600">
                      <span className="flex items-center">
                        <Info className="mr-2 h-4 w-4" />
                        Minimum bill amount not met for membership discount
                      </span>
                      <span></span>
                    </div>
                  )}

                  {coupons.selectedCoupon && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center">
                        <Award className="mr-2 h-4 w-4" />
                        Coupon ({coupons.selectedCoupon.code})
                      </span>
                      <span>-₹{coupons.couponDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {discountType !== "none" && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center">
                        <Percent className="mr-2 h-4 w-4" />
                        Discount
                        {discountType === "percentage" && ` (${discountValue}%)`}
                      </span>
                      <span>
                        -₹
                        {(discountType === "percentage"
                          ? subtotal * (discountValue / 100)
                          : discountValue
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {taxes.taxAmount > 0 && taxes.appliedTaxName && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center">
                        <Percent className="mr-2 h-4 w-4" />
                        Tax ({taxes.appliedTaxName})
                      </span>
                      <span>₹{taxes.taxAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {selectedCustomer && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm items-center">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Award className="h-4 w-4 text-yellow-500" /> Points Earning
                        </span>
                        <span className="font-semibold text-yellow-600">{loyalty.pointsToEarn} pts</span>
                      </div>
                      <div className="flex justify-between text-sm items-center">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Award className="h-4 w-4 text-blue-500" /> Available Points
                        </span>
                        <span className="font-semibold text-blue-600">{loyalty.walletBalance} pts</span>
                      </div>
                      {/* Always show the redeem points option when customer has points */}
                      {loyalty.walletBalance > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <label
                            htmlFor="use-loyalty-points"
                            className="flex items-center gap-2 text-muted-foreground"
                          >
                            <Award className="h-4 w-4 text-green-500" /> Redeem Points
                          </label>
                          <input
                            id="use-loyalty-points"
                            type="checkbox"
                            checked={loyalty.usePoints}
                            onChange={(e) => loyalty.setUsePoints(e.target.checked)}
                            className="h-4 w-4 text-green-500 focus:ring-green-500"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {loyalty.pointsDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center">
                        <Award className="mr-2 h-4 w-4" />
                        Loyalty Points Discount
                      </span>
                      <span>-₹{loyalty.pointsDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Round Off</span>
                    <span>{roundOffDifference > 0 ? `+₹${formatPrice(roundOffDifference)}` : `₹${formatPrice(roundOffDifference)}`}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed bottom section with shadow and background - only payment and total */}
          <div className="sticky bottom-0 border-t bg-white pt-3 space-y-4 flex-shrink-0">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>₹{roundedTotal.toFixed(2)}</span>
            </div>

            <div className="pt-2 space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Payment Method</h4>
                <Select
                  value={paymentMethod}
                  onValueChange={onPaymentMethodChange}
                  defaultValue=""
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.name}>
                          {method.name}
                        </SelectItem>
                      ))
                    ):  null}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 flex items-center justify-center gap-2"
                  size="lg"
                  onClick={() => {
                    if (!loadingPayment) {
                      handlePayment();
                    }
                  }}
                  disabled={selectedItems.length === 0 || loadingPayment}
                >
                  {loadingPayment ? (
                    <>
                      <LoaderCircle
                        className="animate-spin"
                        size={16}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      Processing...
                    </>
                  ) : (
                    "Complete Payment"
                  )}
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

                      <h3 className="font-semibold">Coupons</h3>
                      <div className="flex gap-4">
                        <Select
                          value={coupons.selectedCouponId || "none"}
                          onValueChange={coupons.handleCouponChange}
                          disabled={coupons.isLoadingCoupons}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {coupons.selectedCoupon
                                ? coupons.selectedCoupon.code
                                : "Select coupon"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Coupon</SelectItem>
                            {coupons.availableCoupons.map((coupon) => (
                              <SelectItem key={coupon.id} value={coupon.id}>
                                {coupon.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {coupons.selectedCoupon && (
                        <div className="text-xs text-green-600">
                          <span>
                            {coupons.selectedCoupon.discount_type === "percentage"
                              ? `${coupons.selectedCoupon.discount_value}% off`
                              : `Fixed ₹${coupons.selectedCoupon.discount_value} off`}
                          </span>
                        </div>
                      )}

                      <h3 className="font-semibold">Tax</h3>
                      <div className="flex gap-4">
                        <Select
                          value={taxes.appliedTaxId || "none"}
                          onValueChange={taxes.handleTaxChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tax" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Tax</SelectItem>
                            {taxes.taxRates.map((tax) => (
                              <SelectItem key={tax.id} value={tax.id}>
                                {tax.name} ({tax.percentage}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};