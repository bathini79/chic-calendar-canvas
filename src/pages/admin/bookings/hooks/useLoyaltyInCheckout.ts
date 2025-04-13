
import { useState, useEffect } from "react";
import { useLoyaltyPoints } from "@/hooks/use-loyalty-points";
import { Service, Package } from "@/pages/admin/bookings/types";

interface UseLoyaltyInCheckoutProps {
  customerId?: string;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  subtotal: number;
  discountedSubtotal: number;
}

interface UseLoyaltyInCheckoutResult {
  isLoyaltyEnabled: boolean;
  pointsToEarn: number;
  customerPoints: number;
  usePoints: boolean;
  pointsToRedeem: number;
  pointsDiscountAmount: number;
  maxPointsToRedeem: number;
  minRedemptionPoints: number;
  pointValue: number;
  maxRedemptionType: "fixed" | "percentage" | null;
  maxRedemptionValue: number | null;
  setUsePoints: (usePoints: boolean) => void;
  setPointsToRedeem: (points: number) => void;
}

export function useLoyaltyInCheckout({
  customerId,
  selectedServices,
  selectedPackages,
  services,
  packages,
  subtotal,
  discountedSubtotal
}: UseLoyaltyInCheckoutProps): UseLoyaltyInCheckoutResult {
  const {
    settings,
    isEligibleForPoints,
    customerPoints: availablePoints,
    getEligibleAmount,
    calculatePointsFromAmount,
    calculateAmountFromPoints,
    hasMinimumForRedemption,
    getMaxRedeemablePoints,
    fetchCustomerPoints
  } = useLoyaltyPoints(customerId);
  
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  
  // Force refresh customer points to ensure up-to-date data
  useEffect(() => {
    if (customerId) {
      fetchCustomerPoints();
    }
  }, [customerId]);
  
  // Eligible amount for earning points - based on selected services and packages
  const eligibleAmount = getEligibleAmount(
    selectedServices,
    selectedPackages,
    services,
    packages,
    discountedSubtotal // Use the discounted subtotal for earnings
  );
  
  // Calculate points that will be earned from this purchase
  const pointsToEarn = calculatePointsFromAmount(eligibleAmount);
  
  // Get the maximum points that can be redeemed based on settings and available points
  const maxPointsToRedeem = getMaxRedeemablePoints(subtotal);
  
  // Calculate the discount amount from redeemed points
  const pointsDiscountAmount = usePoints 
    ? calculateAmountFromPoints(pointsToRedeem)
    : 0;
  
  // When loyalty settings or available points change, reset the points to redeem
  useEffect(() => {
    if (settings && availablePoints !== null) {
      // If user has enough points, default to minimum redemption points or zero
      if (hasMinimumForRedemption(availablePoints)) {
        setPointsToRedeem(Math.min(settings.min_redemption_points, availablePoints));
      } else {
        setUsePoints(false);
        setPointsToRedeem(0);
      }
    }
  }, [settings, availablePoints, hasMinimumForRedemption]);
  
  // When usePoints changes, reset or set pointsToRedeem
  useEffect(() => {
    if (!usePoints) {
      setPointsToRedeem(0);
    } else if (settings && availablePoints !== null && hasMinimumForRedemption(availablePoints)) {
      setPointsToRedeem(Math.min(settings.min_redemption_points, availablePoints));
    }
  }, [usePoints, settings, availablePoints, hasMinimumForRedemption]);
  
  return {
    isLoyaltyEnabled: Boolean(settings?.enabled),
    pointsToEarn,
    customerPoints: availablePoints || 0,
    usePoints,
    pointsToRedeem,
    pointsDiscountAmount,
    maxPointsToRedeem,
    minRedemptionPoints: settings?.min_redemption_points || 100,
    pointValue: settings?.point_value || 0.01,
    maxRedemptionType: settings?.max_redemption_type || null,
    maxRedemptionValue: settings?.max_redemption_type === "fixed" 
      ? settings?.max_redemption_points 
      : settings?.max_redemption_percentage,
    setUsePoints,
    setPointsToRedeem
  };
}
