
import { useState } from "react";

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
}: UseLoyaltyInCheckoutProps): UseLoyaltyInCheckoutResult {
  // Return dummy values without any real functionality
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  
  // Return a default object with disabled loyalty functionality
  return {
    isLoyaltyEnabled: false, // Disable loyalty system
    pointsToEarn: 0,
    walletBalance: 0,
    cashbackBalance: 0,
    usePoints,
    pointsToRedeem,
    pointsDiscountAmount: 0,
    maxPointsToRedeem: 0,
    minRedemptionPoints: 100,
    pointValue: 0,
    maxRedemptionType: null,
    maxRedemptionValue: null,
    setUsePoints,
    setPointsToRedeem,
    customerPoints: null
  };
}
