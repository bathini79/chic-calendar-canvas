
import { useState, useEffect, useCallback, useRef } from "react";
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
  walletBalance: number;
  cashbackBalance: number;
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
  customerPoints: { walletBalance: number; cashbackBalance: number } | null;
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
    customerPoints,
    getEligibleAmount,
    calculatePointsFromAmount,
    calculateAmountFromPoints,
    hasMinimumForRedemption,
    getMaxRedeemablePoints,
    fetchCustomerPoints,
    autoTransferCashbackToWallet
  } = useLoyaltyPoints(customerId);
  
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  
  // Force refresh customer points to ensure up-to-date data - but using useCallback to prevent infinite loops
  const refreshCustomerPoints = useCallback(() => {
    if (customerId) {
      console.log('Refreshing points in checkout for customer:', customerId);
      fetchCustomerPoints();
    }
  }, [customerId, fetchCustomerPoints]);
  
  // Only fetch points when component mounts or customerId changes
  useEffect(() => {
    refreshCustomerPoints();
  }, [refreshCustomerPoints]);
  
  // Auto-transfer cashback to wallet when component loads and whenever customer points change
  // Using refs to prevent infinite loops caused by the effect dependency on autoTransferCashbackToWallet
  useEffect(() => {
    if (customerId && customerPoints && customerPoints.cashbackBalance > 0) {
      console.log('Detected cashback balance, attempting auto-transfer');
      // Only transfer if there's actual cashback to transfer
      if (customerPoints.cashbackBalance > 0) {
        autoTransferCashbackToWallet(customerPoints.cashbackBalance);
      }
    }
  }, [customerId, customerPoints]);
  
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
    if (settings && customerPoints) {
      console.log('Settings or points changed, recalculating. Available points:', customerPoints);
      
      // Reset points to redeem when usePoints is false
      if (!usePoints) {
        setPointsToRedeem(0);
        return;
      }
      
      // If user has enough points, default to minimum redemption points or zero
      if (hasMinimumForRedemption(customerPoints)) {
        const minimumRedemption = Math.min(
          settings.min_redemption_points, 
          customerPoints.walletBalance,
          maxPointsToRedeem || Infinity
        );
        setPointsToRedeem(minimumRedemption);
      } else {
        setUsePoints(false);
        setPointsToRedeem(0);
      }
    }
  }, [settings, customerPoints, hasMinimumForRedemption, usePoints, maxPointsToRedeem]);
  
  return {
    isLoyaltyEnabled: Boolean(settings?.enabled),
    pointsToEarn,
    walletBalance: customerPoints?.walletBalance || 0,
    cashbackBalance: customerPoints?.cashbackBalance || 0,
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
    setPointsToRedeem,
    customerPoints
  };
}
