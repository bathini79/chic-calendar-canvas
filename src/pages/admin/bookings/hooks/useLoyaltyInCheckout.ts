
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
    hasMinimumForRedemption
  } = useLoyaltyPoints(customerId);
  
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  
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
  
  // The maximum points that can be redeemed (limited by available points and purchase amount)
  const maxRedeemableByAmount = Math.floor(subtotal / (settings?.point_value || 0.01));
  const maxPointsToRedeem = availablePoints 
    ? Math.min(availablePoints, maxRedeemableByAmount) 
    : 0;
  
  // Calculate the discount amount from redeemed points
  const pointsDiscountAmount = usePoints 
    ? calculateAmountFromPoints(pointsToRedeem)
    : 0;
  
  // When loyalty settings or available points change, reset the points to redeem
  useEffect(() => {
    if (settings && availablePoints) {
      // If user has enough points, default to minimum redemption points
      if (hasMinimumForRedemption(availablePoints)) {
        setPointsToRedeem(settings.min_redemption_points);
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
    } else if (settings && availablePoints && hasMinimumForRedemption(availablePoints)) {
      setPointsToRedeem(settings.min_redemption_points);
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
    setUsePoints,
    setPointsToRedeem
  };
}
