import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReferralProgram } from "@/hooks/use-referral-program";
import { useDiscountRewardUsageConfig } from "@/hooks/use-discount-reward-usage-config";

interface UseReferralWalletInCheckoutProps {
  customerId?: string;
  discountedSubtotal: number;
  locationId?: string;
  activeDiscounts?: string[]; // Track which discount types are active
}

interface UseReferralWalletInCheckoutResult {
  isReferralWalletEnabled: boolean;
  referralWalletBalance: number;
  useReferralWallet: boolean;
  referralWalletAmount: number;
  referralWalletToRedeem: number;
  referralWalletDiscountAmount: number;
  setUseReferralWallet: (useWallet: boolean) => void;
  setReferralWalletAmount: (amount: number) => void;
  disabledReason?: string; // Reason why referral wallet is disabled (for display to user)
  referralConfig: {
    isEnabled: boolean;
    allowedByStrategy: boolean;
    maxRewardsReached: boolean;
    referralEnabledInConfig: boolean;
  };
}

export function useReferralWalletInCheckout({
  customerId,
  discountedSubtotal,
  locationId,
  activeDiscounts = []
}: UseReferralWalletInCheckoutProps): UseReferralWalletInCheckoutResult {
  const [referralWalletBalance, setReferralWalletBalance] = useState<number>(0);
  const [referralWalletAmount, setReferralWalletAmount] = useState<number>(0);
  const [useReferralWallet, setUseReferralWallet] = useState<boolean>(false); // Default to false - user must explicitly check box
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { referralProgram } = useReferralProgram();
  const { config: discountConfig } = useDiscountRewardUsageConfig(locationId);
  
  // Fetch the customer's referral wallet balance
  useEffect(() => {
    const fetchReferralWalletBalance = async () => {
      if (!customerId) {
        setReferralWalletBalance(0);
        return;
      }
      
      setIsLoading(true);
      try {
        // Using any type to bypass TypeScript errors since the database schema has this column
        const { data, error } = await supabase
          .from("profiles")
          .select("referral_wallet")
          .eq("id", customerId)
          .single() as any;
          
        if (error) {
          console.error("Error fetching referral wallet balance:", error);
          setReferralWalletBalance(0);
        } else {
          const balance = data?.referral_wallet ?? 0;
          setReferralWalletBalance(balance);
          // Set the amount to the full wallet balance by default
          setReferralWalletAmount(balance);
        }
      } catch (error) {
        console.error("Error in referral wallet fetch:", error);
        setReferralWalletBalance(0);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReferralWalletBalance();
  }, [customerId]);
  
  // Determine if the referral wallet feature is enabled based on config and active discounts
  const isEnabled = useMemo(() => {
    // Only enable the wallet if:
    // 1. The referral program is enabled
    // 2. The customer has a balance > 0
    // 3. Referral rewards are enabled in the discount config
    // 4. The discount strategy allows for this reward type to be used with other active discounts
    
    const programEnabled = referralProgram?.is_enabled === true;
    const hasBalance = referralWalletBalance > 0;
    
    // Check discount config rules
    const referralEnabledInConfig = discountConfig?.referral_enabled !== false; // Default to true if config is not available
    
    // Check for conflicts with reward strategy
    let allowedByStrategy = true;
    if (discountConfig) {
      // Log the validation state for debugging
      console.log("Validating referral wallet with config:", { 
        strategy: discountConfig.reward_strategy,
        activeDiscounts,
        maxRewards: discountConfig.max_rewards_per_booking
      });
        if (discountConfig.reward_strategy === 'single_only' && activeDiscounts.length > 0) {
        // If strategy is single only and there are already other discounts, don't allow this one
        console.log("Single-only strategy detected with active discounts - disabling referral wallet");
        allowedByStrategy = false;
      }
        if (discountConfig.reward_strategy === 'combinations_only' && 
          discountConfig.reward_combinations && 
          discountConfig.reward_combinations.length > 0) {
        // Check if the combination of discounts is allowed
        const currentDiscounts = [...activeDiscounts, 'referral'];
        
        console.log("Checking referral wallet with combinations_only strategy:");
        console.log("- Current discounts:", currentDiscounts);
        console.log("- Allowed combinations:", discountConfig.reward_combinations);
        
        // For combinations_only strategy, we need to check:
        // 1. If only one discount type is being used, check if it appears in any combination
        // 2. If multiple discounts are being used, they must match an exact combination
        
        if (currentDiscounts.length === 1) {
          // Single discount type - check if "referral" appears in any allowed combination
          const referralAllowedInAnyCombination = discountConfig.reward_combinations.some(combination => 
            combination.includes('referral')
          );
          
          allowedByStrategy = referralAllowedInAnyCombination;
          
          if (allowedByStrategy) {
            console.log("- Referral is allowed as single discount (appears in combinations)");
          } else {
            console.log("- Referral is not allowed as single discount (doesn't appear in any combination)");
          }
        } else {
          // Multiple discounts - must match an exact combination
          const isAllowedCombination = discountConfig.reward_combinations.some(combination => {
            const sortedCombination = [...combination].sort();
            const sortedCurrentDiscounts = [...currentDiscounts].sort();
            
            // Check if current discounts match this allowed combination (same items, same length)
            const isMatch = sortedCombination.length === sortedCurrentDiscounts.length &&
              sortedCurrentDiscounts.every((discount, index) => discount === sortedCombination[index]);
              
            if (isMatch) {
              console.log(`- Found matching combination: [${combination.join(', ')}]`);
            }
            
            return isMatch;
          });
          
          allowedByStrategy = isAllowedCombination;
          
          if (!allowedByStrategy) {
            console.log("- No allowed combination found for this set of discounts");
          }
        }
      }
      
      // Check max rewards limit
      if (activeDiscounts.length >= discountConfig.max_rewards_per_booking) {
        console.log("Max rewards reached - disabling referral wallet");
        allowedByStrategy = false;
      }
    }
    
    const result = programEnabled && hasBalance && referralEnabledInConfig && allowedByStrategy;
    console.log("Referral wallet enabled:", result);
    return result;
  }, [referralProgram, referralWalletBalance, discountConfig, activeDiscounts]);
    // Calculate how much can be redeemed from the wallet
  const referralWalletToRedeem = useMemo(() => {
    if (referralWalletAmount <= 0 || !useReferralWallet || !isEnabled) {
      return 0;
    }
    
    // Use the lesser of specified amount, wallet balance, or remaining subtotal
    return Math.min(referralWalletAmount, referralWalletBalance, discountedSubtotal);
  }, [referralWalletAmount, referralWalletBalance, discountedSubtotal, useReferralWallet, isEnabled]);
  
  // The actual amount to be deducted from the total
  const referralWalletDiscountAmount = useMemo(() => {
    // Only apply the discount if:
    // 1. The feature is enabled (which includes all validation checks)
    // 2. The user has explicitly checked the box to use the wallet
    // 3. There is an amount to redeem
    return isEnabled && useReferralWallet && referralWalletToRedeem > 0 ? referralWalletToRedeem : 0;
  }, [referralWalletToRedeem, isEnabled, useReferralWallet]);
    // When user checks the checkbox, set the amount to max available by default
  useEffect(() => {
    if (useReferralWallet) {
      // Set to maximum available balance when enabled
      setReferralWalletAmount(referralWalletBalance);
    } else {
      // Reset the amount when disabled
      setReferralWalletAmount(0);
    }
  }, [useReferralWallet, referralWalletBalance]);
    // Disable the wallet usage if validation fails
  useEffect(() => {
    if (!isEnabled && useReferralWallet) {
      console.log("Automatically unchecking referral wallet checkbox due to validation failure");
      console.log("Validation status:", {
        programEnabled: referralProgram?.is_enabled,
        hasBalance: referralWalletBalance > 0,
        referralEnabledInConfig: discountConfig?.referral_enabled !== false,
        strategy: discountConfig?.reward_strategy,
        activeDiscounts,
      });
      
      setUseReferralWallet(false);
    }
  }, [isEnabled, useReferralWallet, referralProgram?.is_enabled, referralWalletBalance, discountConfig, activeDiscounts]);

  // Handler for setting the wallet amount with validation
  const setValidatedReferralWalletAmount = (amount: number) => {
    // Ensure amount is not negative
    const validAmount = Math.max(0, amount);
    // Ensure amount doesn't exceed wallet balance
    const cappedAmount = Math.min(validAmount, referralWalletBalance);
    setReferralWalletAmount(cappedAmount);
  };
  
  // Build up the disabled reason
  let disabledReason: string | undefined = undefined;
  
  if (!referralProgram?.is_enabled) {
    disabledReason = "Referral program is not enabled";
  } else if (referralWalletBalance <= 0) {
    disabledReason = "No referral wallet balance available";
  } else if (discountConfig && !discountConfig.referral_enabled) {
    disabledReason = "Referral rewards are disabled for this location";
  } else if (discountConfig?.reward_strategy === 'single_only' && activeDiscounts.length > 0) {
    disabledReason = "Only one discount can be used at a time";
  } else if (activeDiscounts.length >= (discountConfig?.max_rewards_per_booking || 1)) {
    disabledReason = `Maximum of ${discountConfig?.max_rewards_per_booking} discounts allowed per booking`;  } else if (discountConfig?.reward_strategy === 'combinations_only') {
    // Check what the actual issue is for a more specific message
    const currentDiscounts = [...activeDiscounts, 'referral'];
    
    if (currentDiscounts.length === 1) {
      // Single discount - check if referral appears in any combination
      const referralInCombinations = discountConfig.reward_combinations?.some(combination => 
        combination.includes('referral')
      );
      
      if (!referralInCombinations) {
        disabledReason = "Referral wallet can only be used in combination with other discounts";
      } else {
        disabledReason = "This discount combination is not allowed";
      }
    } else {
      disabledReason = "This discount combination is not allowed";
    }
  }

  // Extract config settings for detailed status info
  const programEnabled = referralProgram?.is_enabled === true;
  const hasBalance = referralWalletBalance > 0;
  const referralEnabledInConfig = discountConfig?.referral_enabled !== false;
  
  // Check for conflicts with reward strategy
  let allowedByStrategy = true;
  let maxRewardsReached = false;
    if (discountConfig) {
    if (discountConfig.reward_strategy === 'single_only' && activeDiscounts.length > 0) {
      allowedByStrategy = false;
    }
      if (discountConfig.reward_strategy === 'combinations_only' && 
        discountConfig.reward_combinations && 
        discountConfig.reward_combinations.length > 0) {
      // Check if the combination of discounts is allowed
      const currentDiscounts = [...activeDiscounts, 'referral'];
      
      // For combinations_only strategy, we need to check:
      // 1. If only one discount type is being used, check if it appears in any combination
      // 2. If multiple discounts are being used, they must match an exact combination
      
      if (currentDiscounts.length === 1) {
        // Single discount type - check if "referral" appears in any allowed combination
        const referralAllowedInAnyCombination = discountConfig.reward_combinations.some(combination => 
          combination.includes('referral')
        );
        
        allowedByStrategy = referralAllowedInAnyCombination;
      } else {
        // Multiple discounts - must match an exact combination
        const isAllowedCombination = discountConfig.reward_combinations.some(combination => {
          const sortedCombination = [...combination].sort();
          const sortedCurrentDiscounts = [...currentDiscounts].sort();
          
          // Check if current discounts match this allowed combination (same items, same length)
          return sortedCombination.length === sortedCurrentDiscounts.length &&
            sortedCurrentDiscounts.every((discount, index) => discount === sortedCombination[index]);
        });
        
        allowedByStrategy = isAllowedCombination;
      }
    }
    
    // Check max rewards limit
    if (activeDiscounts.length >= discountConfig.max_rewards_per_booking) {
      maxRewardsReached = true;
      allowedByStrategy = false;
    }
  }

  return {
    isReferralWalletEnabled: isEnabled,
    referralWalletBalance,
    useReferralWallet,
    referralWalletAmount,
    referralWalletToRedeem,
    referralWalletDiscountAmount,
    setUseReferralWallet,
    setReferralWalletAmount: setValidatedReferralWalletAmount,
    disabledReason,
    referralConfig: {
      isEnabled: programEnabled,
      allowedByStrategy,
      maxRewardsReached,
      referralEnabledInConfig
    }
  };
}