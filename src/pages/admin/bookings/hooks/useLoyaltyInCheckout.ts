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
  
  // Keep track of whether points need to be reset
  const shouldResetPointsRef = useRef(false);
  
  // Force refresh customer points to ensure up-to-date data
  const refreshCustomerPoints = useCallback(() => {
    if (customerId) {
      fetchCustomerPoints();
    }
  }, [customerId, fetchCustomerPoints]);
  
  // Only fetch points when component mounts or customerId changes
  useEffect(() => {
    refreshCustomerPoints();
  }, [customerId, refreshCustomerPoints]);
  
  // Auto-transfer cashback to wallet when component loads
  useEffect(() => {
    if (customerId && customerPoints && customerPoints.cashbackBalance > 0) {
      console.log('Detected cashback balance, attempting auto-transfer');
      autoTransferCashbackToWallet(customerPoints.cashbackBalance);
    }
  }, [customerId, customerPoints, autoTransferCashbackToWallet]);
  
  // Calculate eligible amount for earning points
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
  const pointsDiscountAmount = usePoints && pointsToRedeem > 0
    ? calculateAmountFromPoints(pointsToRedeem)
    : 0;
  
  // Reset points to redeem when settings or points change
  useEffect(() => {
    if (!settings || !customerPoints) {
      shouldResetPointsRef.current = true;
      return;
    }
    
    console.log('Loyalty settings or points changed, recalculating');
    console.log('Available points:', customerPoints.walletBalance);
    console.log('Max redeemable points:', maxPointsToRedeem);
    console.log('Min redemption points:', settings.min_redemption_points);
    
    // Reset points to redeem when usePoints is toggled off
    if (!usePoints) {
      setPointsToRedeem(0);
      shouldResetPointsRef.current = false;
      return;
    }
    
    // Only update the points to redeem if we have a pending reset or initial setup
    if (shouldResetPointsRef.current || pointsToRedeem === 0) {
      // Check if user has enough points for minimum redemption
      if (hasMinimumForRedemption(customerPoints)) {
        // Set to minimum redemption amount or maximum available, whichever is lower
        const initialRedemption = Math.min(
          settings.min_redemption_points,
          maxPointsToRedeem
        );
        
        if (initialRedemption > 0) {
          console.log(`Setting initial points to redeem: ${initialRedemption}`);
          setPointsToRedeem(initialRedemption);
        } else {
          console.log('Not enough points available to meet redemption criteria');
          setUsePoints(false);
          setPointsToRedeem(0);
        }
      } else {
        console.log('Customer does not have minimum points required for redemption');
        setUsePoints(false);
        setPointsToRedeem(0);
      }
      
      shouldResetPointsRef.current = false;
    } else {
      // Ensure existing pointsToRedeem doesn't exceed new maxPointsToRedeem
      if (pointsToRedeem > maxPointsToRedeem) {
        console.log(`Adjusting points to redeem from ${pointsToRedeem} to ${maxPointsToRedeem}`);
        setPointsToRedeem(maxPointsToRedeem);
      }
    }
  }, [
    settings, 
    customerPoints, 
    hasMinimumForRedemption, 
    usePoints, 
    maxPointsToRedeem, 
    pointsToRedeem
  ]);
  
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
