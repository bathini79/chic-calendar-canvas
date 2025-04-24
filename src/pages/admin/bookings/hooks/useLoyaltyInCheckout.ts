import { useState, useEffect, useMemo } from "react";
import { useLoyaltyPoints } from "@/hooks/use-loyalty-points";

interface UseLoyaltyInCheckoutProps {
  customerId?: string;
  selectedServices: string[];
  selectedPackages: string[];
  services: any[];
  packages: any[];
  subtotal: number;
  discountedSubtotal: number;
}

interface UseLoyaltyInCheckoutResult {
  isLoyaltyEnabled: boolean;
  pointsToEarn: number;
  walletBalance: number;
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
  customerPoints: { walletBalance: number; lastUsed: Date | null } | null;
  pointsExpiryDate: Date | null;
  adjustedServicePrices: Record<string, number>;
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
  const [usePoints, setUsePoints] = useState(true); // Default to true to always redeem points
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsExpiryDate, setPointsExpiryDate] = useState<Date | null>(null);
  const [adjustedServicePrices, setAdjustedServicePrices] = useState<Record<string, number>>({});
  
  const {
    settings,
    customerPoints,
    isEligibleForPoints,
    getEligibleAmount,
    calculatePointsFromAmount,
    calculateAmountFromPoints,
    getMaxRedeemablePoints,
    walletBalance,
    lastUsed
  } = useLoyaltyPoints(customerId);

  // Calculate points to earn based on eligible amount
  const eligibleAmount = useMemo(() => 
    settings?.enabled
      ? getEligibleAmount(selectedServices, selectedPackages, services, packages, subtotal)
      : 0,
    [settings?.enabled, selectedServices, selectedPackages, services, packages, subtotal, getEligibleAmount]
  );
    
  const pointsToEarn = useMemo(() => 
    settings?.enabled ? calculatePointsFromAmount(eligibleAmount) : 0,
    [settings?.enabled, calculatePointsFromAmount, eligibleAmount]
  );

  // Calculate expiry date based on points validity days
  useEffect(() => {
    if (settings?.enabled && settings.points_validity_days && pointsToEarn > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + settings.points_validity_days);
      setPointsExpiryDate(expiryDate);
    } else {
      setPointsExpiryDate(null);
    }
  }, [settings, pointsToEarn]);

  // Handle maximum points to redeem based on transaction amount and settings
  const maxPointsToRedeem = useMemo(() => {
    if (!settings?.enabled || !settings.points_per_spend) return 0;
    
    // Use discountedSubtotal (after other discounts) for redemption calculation
    // This ensures loyalty points are applied after other discounts
    return Math.min(
      walletBalance, 
      getMaxRedeemablePoints(discountedSubtotal)
    );
  }, [settings?.enabled, settings?.points_per_spend, discountedSubtotal, walletBalance, getMaxRedeemablePoints]);

  // Automatically set points to redeem when the maximum changes
  useEffect(() => {
    // Always set to maximum if enabled and there are points available
    if (settings?.enabled && walletBalance >= (settings?.min_redemption_points || 0) && maxPointsToRedeem > 0) {
      setPointsToRedeem(maxPointsToRedeem);
    } else {
      setPointsToRedeem(0);
    }
  }, [maxPointsToRedeem, settings, walletBalance]);

  // Calculate discount amount from redeemed points
  const pointsDiscountAmount = useMemo(() => 
    settings?.enabled && settings?.points_per_spend && pointsToRedeem > 0 && usePoints
      ? calculateAmountFromPoints(pointsToRedeem)
      : 0,
    [settings?.enabled, settings?.points_per_spend, pointsToRedeem, usePoints, calculateAmountFromPoints]
  );

  // Determine the point value (how much 1 point is worth)
  const pointValue = useMemo(() => 
    settings?.points_per_spend ? (1 / settings.points_per_spend) : 0,
    [settings?.points_per_spend]
  );

  // Calculate adjusted service prices with loyalty discount
  useEffect(() => {
    // For loyalty points, we don't need to calculate per-service adjustments
    // since the discount is applied to the total only
    // Just return an empty object as we won't be applying discounts at the service level
    setAdjustedServicePrices({});
  }, [pointsDiscountAmount, discountedSubtotal]);

  return {
    isLoyaltyEnabled: settings?.enabled || false,
    pointsToEarn,
    walletBalance,
    usePoints,
    pointsToRedeem,
    pointsDiscountAmount,
    maxPointsToRedeem,
    minRedemptionPoints: settings?.min_redemption_points || 100,
    pointValue,
    maxRedemptionType: settings?.max_redemption_type as "fixed" | "percentage" | null,
    maxRedemptionValue: 
      settings?.max_redemption_type === "fixed" 
        ? settings.max_redemption_points 
        : settings?.max_redemption_type === "percentage" 
          ? settings.max_redemption_percentage 
          : null,
    setUsePoints,
    setPointsToRedeem,
    customerPoints,
    pointsExpiryDate,
    adjustedServicePrices
  };
}
