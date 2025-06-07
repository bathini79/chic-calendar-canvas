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
  Users,
  Search,
  X,
} from "lucide-react";
import type { Service, Package, Customer } from "../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import {
  getTotalPrice,
  getFinalPrice,
  getAdjustedServicePrices,
} from "../utils/bookingUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SelectedItem } from "./SelectedItem";
import { useLoyaltyInCheckout } from "../hooks/useLoyaltyInCheckout";
import { useMembershipInCheckout } from "../hooks/useMembershipInCheckout";
import { useCouponsInCheckout } from "../hooks/useCouponsInCheckout";
import { useTaxesInCheckout } from "../hooks/useTaxesInCheckout";
import { useSelectedItemsInCheckout } from "../hooks/useSelectedItemsInCheckout";
import { usePaymentHandler } from "../hooks/usePaymentHandler";
import { useReferralInCheckout } from "../hooks/useReferralInCheckout";
import { useReferralWalletInCheckout } from "../hooks/useReferralWalletInCheckout";
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
  onBackToServices: () => void;  isExistingAppointment?: boolean;
  customizedServices?: Record<string, string[]>;  locationId?: string;
  loadingPayment?: boolean;
  setLoadingPayment?: (loading: boolean) => void;
  employees: any[];
  existingAppointment?: any; // For restoring referral wallet state
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
  onBackToServices,  customizedServices = {},
  locationId,
  loadingPayment = false,
  setLoadingPayment,
  employees,
  existingAppointment,
}) => {
  // Check if this is a new customer (no previous appointments)
  const [isNewCustomer, setIsNewCustomer] = useState<boolean>(false);

  // Referral dropdown state
  const [showReferralDropdown, setShowReferralDropdown] =
    useState<boolean>(false);
  const referralSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkNewCustomer = async () => {
      if (!selectedCustomer?.id) return;

      try {
        // Check if customer has any previous completed appointments
        const { count, error } = await supabase
          .from("appointments")
          .select("id", { count: "exact" })
          .eq("customer_id", selectedCustomer.id)
          .eq("status", "completed");

        if (error) {
          console.error("Error checking customer appointments:", error);
          return;
        }

        // Customer is new if they have no completed appointments
        setIsNewCustomer(count === 0);
      } catch (error) {
        console.error("Error checking customer status:", error);
      }
    };
    checkNewCustomer();
  }, [selectedCustomer?.id]);

  // Handle click outside to close referral dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        referralSearchRef.current &&
        !referralSearchRef.current.contains(event.target as Node)
      ) {
        setShowReferralDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
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

  // Calculate service, membership, and product totals for referral program
  const serviceTotal = useMemo(() => {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      if (!service) return total;
      return total + (service.selling_price || 0);
    }, 0);
  }, [selectedServices, services]);

  const membershipTotal = useMemo(() => {
    // If there's a membership discount, use that as the membership total
    return membership.membershipDiscount || 0;
  }, [membership.membershipDiscount]);

  const productTotal = useMemo(() => {
    // We're not handling products in this checkout flow currently
    return 0;
  }, []);

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
    discountedSubtotal,
  }); // Track active discounts - needs to be defined before the hook is called
  const activeDiscounts = useMemo(() => {
    const discounts: string[] = [];

    // Track manual discounts
    if (discountType !== "none") {
      discounts.push("discount");
    }

    // Track membership discounts
    if (membership.membershipDiscount > 0) {
      discounts.push("membership");
    }

    // Track coupon discounts
    if (coupons.selectedCoupon) {
      discounts.push("coupon");
    }

    // Track loyalty point redemptions
    if (loyalty.usePoints && loyalty.pointsDiscountAmount > 0) {
      discounts.push("loyalty_points");
    }

    return discounts;
  }, [
    discountType,
    membership.membershipDiscount,
    coupons.selectedCoupon,
    loyalty.usePoints,
    loyalty.pointsDiscountAmount,  ]);  // Initialize the referral wallet hook with active discounts and initial values from existing appointment

  const referralWallet = useReferralWalletInCheckout({
    customerId: selectedCustomer?.id,
    discountedSubtotal: discountedSubtotal - loyalty.pointsDiscountAmount, // Apply after loyalty points
    locationId,
    activeDiscounts,
    initialUseReferralWallet: existingAppointment?.referral_wallet_discount_amount > 0,
    initialReferralWalletAmount: existingAppointment?.referral_wallet_redeemed || 0,
  });
 

  const taxes = useTaxesInCheckout({
    locationId,
    discountedSubtotal,
  });

  // Initialize the referral program hook
  const referral = useReferralInCheckout({
    customerId: selectedCustomer?.id,
    subtotal,
    serviceTotal,
    membershipTotal,
    productTotal,
    isNewCustomer,
  });

  const getStylistName = (stylistId: string) => {
    if (!employees || !stylistId) return null;
    const stylist = employees.find((emp) => emp.id === stylistId);
    return stylist ? stylist.name : null;
  };
  const total = useMemo(() => {
    let calculatedTotal = discountedSubtotal;

    // Apply tax
    calculatedTotal += taxes.taxAmount;

    // Subtract loyalty points discount if applicable
    if (loyalty.usePoints && loyalty.pointsDiscountAmount > 0) {
      calculatedTotal = Math.max(
        0,
        calculatedTotal - loyalty.pointsDiscountAmount
      );
    }
    // Subtract referral wallet only if:
    // 1. The feature is enabled (all validation checks passed)
    // 2. The user has checked the box
    // 3. There's an amount to redeem
    if (
      referralWallet.isReferralWalletEnabled &&
      referralWallet.useReferralWallet &&
      referralWallet.referralWalletDiscountAmount > 0
    ) {
      calculatedTotal = Math.max(
        0,
        calculatedTotal - referralWallet.referralWalletDiscountAmount
      );
    }

    return Math.max(0, calculatedTotal);
  }, [
    discountedSubtotal,
    taxes.taxAmount,
    loyalty.usePoints,
    loyalty.pointsDiscountAmount,
    referralWallet.isReferralWalletEnabled,
    referralWallet.useReferralWallet,
    referralWallet.referralWalletDiscountAmount,
  ]);

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
    coupons.couponDiscount,
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
  });  const { handlePayment } = usePaymentHandler({
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
    referralWallet: {
      referralWalletToRedeem: referralWallet.referralWalletToRedeem,
      referralWalletDiscountAmount: referralWallet.referralWalletDiscountAmount,
    },
    referrerId: referral.selectedReferrerId,
    referralCashback: referral.potentialCashback,
    customerCashback: referral.customerCashback,
    isReferralApplicable: referral.isReferralApplicable,
    subtotal, // Pass the subtotal to ensure it's sent to the backend
    total,
    adjustedPrices,
    onSaveAppointment,
    onPaymentComplete,    // Pass a callback that can update the loading state in AppointmentManager
    setLoading: (loading) => {
      // This will be invoked by the usePaymentHandler hook
      if (setLoadingPayment) {
        setLoadingPayment(loading);
      }
    },
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [selectedItems, subtotal, total]); // Update referral wallet validation when active discounts change
  return (
    <div className="h-full w-full bg-gray-50">
      <Card className="h-[calc(100vh-100px)] overflow-hidden flex flex-col">
        <CardContent className="p-6 h-full flex flex-col">
          {" "}
          <div className="flex flex-col mb-4 gap-2">
            <div className="flex items-center justify-between">
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
                  {membership.membershipDiscount > 0 &&
                    membership.membershipName && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center">
                          <Award className="mr-2 h-4 w-4" />
                          Membership ({membership.membershipName})
                        </span>
                        <span>
                          -₹{membership.membershipDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  {/* Show minimum billing amount warning */}
                  {selectedCustomer &&
                    membership.customerMemberships?.length > 0 &&
                    subtotal > 0 &&
                    !membership.membershipDiscount && (
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
                        {discountType === "percentage" &&
                          ` (${discountValue}%)`}
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
                  )}{" "}
                  {loyalty.isLoyaltyEnabled && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm items-center">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Award className="h-4 w-4 text-yellow-500" /> Points
                          Earning
                        </span>
                        <span className="font-semibold text-yellow-600">
                          {loyalty.pointsToEarn} pts
                        </span>
                      </div>
                      <div className="flex justify-between text-sm items-center">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Award className="h-4 w-4 text-blue-500" /> Available
                          Points
                        </span>
                        <span className="font-semibold text-blue-600">
                          {loyalty.walletBalance} pts
                        </span>
                      </div>{" "}
                      {/* Always show the redeem points option when customer has points */}
                      {loyalty.walletBalance > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <label
                            htmlFor="use-loyalty-points"
                            className="flex items-center gap-2 text-muted-foreground"
                          >
                            <Award className="h-4 w-4 text-green-500" /> Redeem
                            Points
                          </label>
                          <input
                            id="use-loyalty-points"
                            type="checkbox"
                            checked={loyalty.usePoints}
                            onChange={(e) =>
                              loyalty.setUsePoints(e.target.checked)
                            }
                            className="h-4 w-4 text-green-500 focus:ring-green-500"
                          />
                        </div>
                      )}
                    </div>
                  )}{" "}
                  {/* Referral Wallet Section */}
                  {/* Always show balance if customer has any, even if it's disabled by config */}
                  {selectedCustomer &&
                    referralWallet.referralWalletBalance > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm items-center">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4 text-purple-500" />{" "}
                            Referral Wallet Balance
                          </span>
                          <span className="font-semibold text-purple-600">
                            ₹{referralWallet.referralWalletBalance.toFixed(2)}
                          </span>
                        </div>

                        {/* Show relevant status messages based on configuration */}
                        {!referralWallet.referralConfig.isEnabled && (
                          <div className="text-sm text-amber-600 flex items-center gap-2">
                            <Info className="h-4 w-4" /> Referral program is not
                            active
                          </div>
                        )}
                        {!referralWallet.referralConfig
                          .referralEnabledInConfig && (
                          <div className="text-sm text-amber-600 flex items-center gap-2">
                            <Info className="h-4 w-4" /> Referrals are disabled
                            for this location
                          </div>
                        )}
                        {referralWallet.referralConfig.maxRewardsReached && (
                          <div className="text-sm text-amber-600 flex items-center gap-2">
                            <Info className="h-4 w-4" /> Maximum discounts
                            reached for this booking
                          </div>
                        )}
                        {!referralWallet.referralConfig.allowedByStrategy &&
                          !referralWallet.referralConfig.maxRewardsReached && (
                            <div className="text-sm text-amber-600 flex items-center gap-2">
                              <Info className="h-4 w-4" /> This discount
                              combination is not allowed
                            </div>
                          )}

                        {referralWallet.disabledReason &&
                          !referralWallet.isReferralWalletEnabled && (
                            <div className="text-sm text-amber-600 flex items-center gap-2">
                              <Info className="h-4 w-4" />{" "}
                              {referralWallet.disabledReason}
                            </div>
                          )}
                        {/* Only show input controls if the wallet is enabled */}
                        {referralWallet.isReferralWalletEnabled && (
                          <div className="space-y-2">
                            {/* First add a checkbox to use the wallet */}
                            <div className="flex justify-between items-center text-sm">
                              <label
                                htmlFor="use-referral-wallet"
                                className="flex items-center gap-2 text-muted-foreground"
                              >
                                <Users className="h-4 w-4 text-purple-500" />{" "}
                                Use Referral Wallet
                              </label>
                              <input
                                id="use-referral-wallet"
                                type="checkbox"
                                checked={referralWallet.useReferralWallet}
                                onChange={(e) =>
                                  referralWallet.setUseReferralWallet(
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4 text-purple-500 focus:ring-purple-500"
                              />
                            </div>

                            {/* Show amount input only if checkbox is checked */}
                            {referralWallet.useReferralWallet && (
                              <div className="flex justify-between items-center text-sm">
                                <label
                                  htmlFor="referral-wallet-amount"
                                  className="flex items-center gap-2 text-muted-foreground"
                                >
                                  <Users className="h-4 w-4 text-purple-500" />{" "}
                                  Amount to Use
                                </label>
                                <div className="flex items-center">
                                  <span className="mr-1 text-muted-foreground">
                                    ₹
                                  </span>
                                  <Input
                                    id="referral-wallet-amount"
                                    type="number"
                                    min="0"
                                    max={referralWallet.referralWalletBalance}
                                    step="0.01"
                                    value={referralWallet.referralWalletAmount}
                                    onChange={(e) => {
                                      const amount = parseFloat(e.target.value);
                                      if (!isNaN(amount)) {
                                        referralWallet.setReferralWalletAmount(
                                          amount
                                        );
                                      } else {
                                        referralWallet.setReferralWalletAmount(
                                          0
                                        );
                                      }
                                    }}
                                    className="h-7 w-24 py-1 px-2 text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  {/* Referral information is now shown in the popover */}
                  {isNewCustomer &&
                    referral.isReferralEnabled &&
                    referral.selectedReferrerId && (
                      <div className="flex justify-between text-sm text-blue-600">
                        <span className="flex items-center">
                          <Users className="mr-2 h-4 w-4" />
                          Referral Program Active
                        </span>
                        <span>Both get cashback</span>
                      </div>
                    )}{" "}
                  {loyalty.pointsDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center">
                        <Award className="mr-2 h-4 w-4" />
                        Loyalty Points Discount
                      </span>
                      <span>-₹{loyalty.pointsDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {referralWallet.referralWalletDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-purple-600">
                      <span className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        Referral Wallet Discount
                      </span>
                      <span>
                        -₹
                        {referralWallet.referralWalletDiscountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {roundOffDifference > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Round Off</span>
                      <span>
                        {roundOffDifference > 0
                          ? `+₹${formatPrice(roundOffDifference)}`
                          : `₹${formatPrice(roundOffDifference)}`}
                      </span>
                    </div>
                  ) : null}
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
                    {paymentMethods.length > 0
                      ? paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.name}>
                            {method.name}
                          </SelectItem>
                        ))
                      : null}
                  </SelectContent>
                </Select>
              </div>{" "}
              <div className="flex gap-2">                <Button
                  className="flex-1 flex items-center justify-center gap-2"
                  size="lg"
                  onClick={() => {
                    if (!loadingPayment && setLoadingPayment) {
                      // Set loading state immediately when payment button is clicked
                      setLoadingPayment(true);
                      
                      // Handle payment with proper error handling
                      const handlePaymentWithLoading = async () => {
                        try {
                          await handlePayment();
                        } catch (error) {
                          console.error("Payment failed:", error);
                          // Reset loading state on error
                          setLoadingPayment(false);
                        }
                      };
                      
                      handlePaymentWithLoading();
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
                            <SelectItem value="percentage">
                              Percentage
                            </SelectItem>
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

                      {/* Referral Program Section */}
                      {isNewCustomer && referral.isReferralEnabled && (
                        <>
                          <h3 className="font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4" /> Referral Program
                          </h3>
                          <div className="space-y-3">
                            {" "}
                            {!referral.selectedReferrerId ? (
                              <div className="w-full">
                                <div className="mb-2">
                                  <p className="text-sm text-muted-foreground">
                                    Select who referred this customer:
                                  </p>
                                </div>{" "}
                                <div
                                  className="relative"
                                  ref={referralSearchRef}
                                >
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      placeholder="Search by name or phone..."
                                      value={referral.searchTerm}
                                      onChange={(e) =>
                                        referral.setSearchTerm(e.target.value)
                                      }
                                      onFocus={() =>
                                        setShowReferralDropdown(true)
                                      }
                                      className="pl-10 pr-10"
                                    />
                                    {referral.isLoadingReferrers && (
                                      <LoaderCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                                    )}
                                  </div>
                                  {/* Dropdown - Show when focused or when there are customers to display */}
                                  {showReferralDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                      {referral.referrers.length > 0 ? (
                                        referral.referrers.map((ref) => (
                                          <div
                                            key={ref.id}
                                            className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                                            onClick={() => {
                                              referral.setSelectedReferrerId(
                                                ref.id
                                              );
                                              referral.setSearchTerm("");
                                              setShowReferralDropdown(false);
                                            }}
                                          >
                                            <div>
                                              <p className="text-sm font-medium">
                                                {ref.full_name}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {ref.phone_number}
                                              </p>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="p-2 text-center text-sm text-muted-foreground">
                                          {referral.searchTerm.length > 0
                                            ? referral.searchTerm.length < 2
                                              ? "Type at least 2 characters to search"
                                              : "No customers found"
                                            : "No customers available"}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
                                <div className="flex items-center">
                                  {/* Find the selected referrer from all customers */}
                                  {(() => {
                                    const selectedReferrer =
                                      referral.allCustomers.find(
                                        (c) =>
                                          c.id === referral.selectedReferrerId
                                      );
                                    return (
                                      <>
                                        {/* <Avatar className="h-6 w-6 mr-2">
                                          {selectedReferrer?.full_name?.charAt(
                                            0
                                          ) || "C"}
                                        </Avatar> */}
                                        <div>
                                          <p className="text-sm font-medium">
                                            {selectedReferrer?.full_name}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {selectedReferrer?.phone_number}
                                          </p>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    referral.setSelectedReferrerId(null)
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}{" "}
                            {referral.selectedReferrerId && (
                              <div className="text-xs bg-green-50 p-2 rounded">
                                <p className="font-medium text-green-700">
                                  Referral Benefits:
                                </p>
                                <p className="text-green-600 mt-1">
                                  • Referrer gets ₹
                                  {referral.potentialCashback.toFixed(2)}{" "}
                                  cashback
                                </p>
                                <p className="text-green-600">
                                  • Customer gets ₹
                                  {referral.customerCashback.toFixed(2)}{" "}
                                  cashback
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      )}

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
                            {coupons.selectedCoupon.discount_type ===
                            "percentage"
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
 