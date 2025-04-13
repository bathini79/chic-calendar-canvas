
import { useState, useEffect } from "react";
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
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsExpiryDate, setPointsExpiryDate] = useState<Date | null>(null);
  
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
  const eligibleAmount = settings?.enabled
    ? getEligibleAmount(selectedServices, selectedPackages, services, packages, discountedSubtotal)
    : 0;
    
  const pointsToEarn = settings?.enabled
    ? calculatePointsFromAmount(eligibleAmount)
    : 0;

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

  // Handle maximum points to redeem based on settings
  const maxPointsToRedeem = settings?.enabled && settings.points_per_spend
    ? getMaxRedeemablePoints(discountedSubtotal)
    : 0;

  // Reset points to redeem if greater than maximum
  useEffect(() => {
    if (pointsToRedeem > maxPointsToRedeem) {
      setPointsToRedeem(maxPointsToRedeem);
    }
  }, [maxPointsToRedeem, pointsToRedeem]);

  // Calculate discount amount from redeemed points
  const pointsDiscountAmount = usePoints && settings?.enabled && settings?.points_per_spend
    ? calculateAmountFromPoints(pointsToRedeem)
    : 0;

  // Determine the point value (how much 1 point is worth)
  // Calculate from points_per_spend (100/points_per_spend gives value per point)
  const pointValue = settings?.points_per_spend ? (100 / settings.points_per_spend) / 100 : 0;

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
    pointsExpiryDate
  };
}
