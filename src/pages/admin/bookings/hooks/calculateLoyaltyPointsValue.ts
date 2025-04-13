
/**
 * Calculates the monetary value of loyalty points based on the number of points
 * 
 * @param points - Number of loyalty points
 * @param pointValue - The monetary value of a single point (default 1)
 * @returns The monetary value of the points
 */
export function calculateLoyaltyPointsValue(points: number, pointValue: number = 1): number {
  if (!points || points <= 0 || !pointValue || pointValue <= 0) {
    return 0;
  }
  
  return points * pointValue;
}

/**
 * Calculates the number of loyalty points that can be earned from a purchase
 * 
 * @param amount - Purchase amount
 * @param pointsPerSpend - Points earned per currency unit spent (multiply by 100)
 * @returns The number of points earned
 */
export function calculatePointsEarned(amount: number, pointsPerSpend: number): number {
  if (!amount || amount <= 0 || !pointsPerSpend || pointsPerSpend <= 0) {
    return 0;
  }
  
  // Multiply by the points_per_spend factor and divide by 100 
  // (assuming points_per_spend represents points per 100 currency units)
  return Math.floor(amount * (pointsPerSpend / 100));
}

/**
 * Calculates the maximum points that can be redeemed based on wallet balance and redemption rules
 * 
 * @param walletBalance - Current points balance
 * @param subtotal - Purchase subtotal
 * @param minPoints - Minimum points required for redemption
 * @param maxType - Maximum redemption type (fixed or percentage)
 * @param maxValue - Maximum value for redemption
 * @returns The maximum number of points that can be redeemed
 */
export function calculateMaxRedeemablePoints(
  walletBalance: number,
  subtotal: number,
  minPoints: number,
  maxType: "fixed" | "percentage" | null,
  maxValue: number | null
): number {
  // Check if customer has minimum required points
  if (walletBalance < minPoints) {
    return 0;
  }
  
  // Start with wallet balance as the max
  let maxPoints = walletBalance;
  
  // Apply max redemption constraints based on type
  if (maxType === 'fixed' && maxValue) {
    // Limit by fixed maximum points
    maxPoints = Math.min(maxPoints, maxValue);
  } else if (maxType === 'percentage' && maxValue) {
    // Calculate maximum discount based on percentage of subtotal
    const maxDiscountAmount = subtotal * (maxValue / 100);
    
    // Since 1 point = 1 currency unit, maxPoints = maxDiscountAmount
    maxPoints = Math.min(maxPoints, Math.floor(maxDiscountAmount));
  }
  
  // Ensure we don't allow more points than what would cover the subtotal
  maxPoints = Math.min(maxPoints, Math.ceil(subtotal));
  
  // Ensure minimum redemption requirement
  if (maxPoints < minPoints) {
    return 0;
  }
  
  return maxPoints;
}
