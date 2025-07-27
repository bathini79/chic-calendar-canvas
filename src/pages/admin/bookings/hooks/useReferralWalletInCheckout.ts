import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReferralProgram } from "@/hooks/use-referral-program";
import { useDiscountRewardUsageConfig } from "@/hooks/use-discount-reward-usage-config";

interface UseReferralWalletInCheckoutProps {
  customerId?: string;
  discountedSubtotal: number;
  locationId?: string;
  activeDiscounts?: string[]; // Track which discount types are active
  initialUseReferralWallet?: boolean; // For restoring existing appointment state
  initialReferralWalletAmount?: number; // For restoring existing appointment amount
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
  activeDiscounts = [],
  initialUseReferralWallet = false,
  initialReferralWalletAmount = 0
}: UseReferralWalletInCheckoutProps): UseReferralWalletInCheckoutResult {  // Remove verbose logging to improve performance
  // console.log("🔄 Initializing useReferralWalletInCheckout with:", {
  //   customerId,
  //   initialUseReferralWallet,
  //   initialReferralWalletAmount,
  //   activeDiscounts
  // });

  const [referralWalletBalance, setReferralWalletBalance] = useState<number>(0);
  const [referralWalletAmount, setReferralWalletAmount] = useState<number>(initialReferralWalletAmount);
  const [useReferralWallet, setUseReferralWallet] = useState<boolean>(initialUseReferralWallet);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const { referralProgram } = useReferralProgram();
  const { config: discountConfig } = useDiscountRewardUsageConfig(locationId);
  // Fetch the customer's referral wallet balance
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount
    
    const fetchReferralWalletBalance = async () => {
      if (!customerId) {
        if (isMounted) {
          setReferralWalletBalance(0);
          setIsLoading(false);
        }
        return;
      }
      
      if (isMounted) {
        setIsLoading(true);
      }
      
      try {
        // Using any type to bypass TypeScript errors since the database schema has this column
        const { data, error } = await supabase
          .from("profiles")
          .select("referral_wallet")
          .eq("id", customerId)
          .single() as any;
          
        if (error) {
          console.error("Error fetching referral wallet balance:", error);
          if (isMounted) {
            setReferralWalletBalance(0);
          }
        } else {
          const balance = data?.referral_wallet ?? 0;
          
          if (isMounted) {
            setReferralWalletBalance(balance);
            
            // Only set the amount to full balance if there's no initial amount from existing appointment
            if (initialReferralWalletAmount === 0) {
              setReferralWalletAmount(balance);
            }
          }
        }
      } catch (error) {
        console.error("Error in referral wallet fetch:", error);
        if (isMounted) {
          setReferralWalletBalance(0);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsInitialLoad(false); // Mark initial load as complete regardless of outcome
        }
      }
    };
    
    fetchReferralWalletBalance();
    
    // Cleanup function to prevent state updates after component unmount
    return () => {
      isMounted = false;
    };
  }, [customerId, initialReferralWalletAmount, setReferralWalletAmount]);
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
      // If this is an existing appointment with referral wallet usage, preserve it regardless of current strategy
    // This ensures that previously valid configurations remain valid when editing
    const isExistingReferralUsage = initialUseReferralWallet && initialReferralWalletAmount > 0;
      if (isExistingReferralUsage) {
      // For existing usage, only check if program is enabled and referral is enabled in config
      // Don't check balance since the appointment may have been created when balance was available
      const result = programEnabled && referralEnabledInConfig;
      return result;
    }
      // Check for conflicts with reward strategy for new referral wallet usage
    let allowedByStrategy = true;
    if (discountConfig) {
      if (discountConfig.reward_strategy === 'single_only' && activeDiscounts.length > 0) {
        // If strategy is single only and there are already other discounts, don't allow this one
        allowedByStrategy = false;
      }        if (discountConfig.reward_strategy === 'combinations_only' && 
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
        allowedByStrategy = false;
      }
    }
    
    return programEnabled && hasBalance && referralEnabledInConfig && allowedByStrategy;
  }, [referralProgram, referralWalletBalance, discountConfig, activeDiscounts]);
  // Calculate how much can be redeemed from the wallet
  const referralWalletToRedeem = useMemo(() => {
    if (referralWalletAmount <= 0 || !useReferralWallet || !isEnabled) {
      return 0;
    }
    
    // For existing appointments, preserve the original redeemed amount regardless of current balance
    const isExistingReferralUsage = initialUseReferralWallet && initialReferralWalletAmount > 0;
    if (isExistingReferralUsage && referralWalletAmount === initialReferralWalletAmount) {
      // Use the existing amount directly for previously created appointments
      return Math.min(referralWalletAmount, discountedSubtotal);
    }
    
    // Use the lesser of specified amount, wallet balance, or remaining subtotal for new usage
    return Math.min(referralWalletAmount, referralWalletBalance, discountedSubtotal);
  }, [referralWalletAmount, referralWalletBalance, discountedSubtotal, useReferralWallet, isEnabled, initialUseReferralWallet, initialReferralWalletAmount]);
  
  // The actual amount to be deducted from the total
  const referralWalletDiscountAmount = useMemo(() => {
    // Only apply the discount if:
    // 1. The feature is enabled (which includes all validation checks)
    // 2. The user has explicitly checked the box to use the wallet
    // 3. There is an amount to redeem
    return isEnabled && useReferralWallet && referralWalletToRedeem > 0 ? referralWalletToRedeem : 0;
  }, [referralWalletToRedeem, isEnabled, useReferralWallet]);    // When user checks the checkbox, set the amount to max available by default
  useEffect(() => {
    if (useReferralWallet) {
      // For existing appointments, preserve the initial amount if it's valid
      if (initialReferralWalletAmount > 0 && initialUseReferralWallet) {
        // Keep the initial amount from the existing appointment
        setReferralWalletAmount(Math.min(initialReferralWalletAmount, referralWalletBalance));
      } else {
        // For new appointments or when manually checking, set to maximum available balance
        setReferralWalletAmount(referralWalletBalance);
      }
    } else {
      // Reset the amount when disabled
      setReferralWalletAmount(0);
    }  }, [useReferralWallet, referralWalletBalance, initialReferralWalletAmount, initialUseReferralWallet]);  // Disable the wallet usage if validation fails (but only after the initial load)
  useEffect(() => {
    // Don't auto-uncheck during initial load or when balance is still loading
    // Also don't auto-uncheck if this is an existing appointment with referral wallet usage
    const isExistingReferralUsage = initialUseReferralWallet && initialReferralWalletAmount > 0;
    
    if (!isEnabled && useReferralWallet && !isLoading && referralWalletBalance >= 0 && !isExistingReferralUsage && !isInitialLoad) {
      setUseReferralWallet(false);
    }
  }, [isEnabled, useReferralWallet, referralProgram?.is_enabled, referralWalletBalance, discountConfig, activeDiscounts, 
     isLoading, initialUseReferralWallet, initialReferralWalletAmount, isInitialLoad]);

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