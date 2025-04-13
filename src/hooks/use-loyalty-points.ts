import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoyaltyProgramSettings } from "@/pages/admin/bookings/types";
import { toast } from "sonner";

interface CustomerPoints {
  walletBalance: number;
  cashbackBalance: number;
}

export function useLoyaltyPoints(customerId?: string) {
  const [settings, setSettings] = useState<LoyaltyProgramSettings | null>(null);
  const [customerPoints, setCustomerPoints] = useState<CustomerPoints | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const autoTransferInProgressRef = useRef(false);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('loyalty_program_settings')
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching loyalty settings:', error);
        return;
      }
      
      if (data) {
        setSettings(data as LoyaltyProgramSettings);
      }
    } catch (error) {
      console.error('Unexpected error fetching loyalty settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerPoints = async () => {
    if (!customerId) {
      setCustomerPoints(null);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Fetching points for customer:', customerId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance, cashback_balance')
        .eq('id', customerId)
        .single();
      
      if (error) {
        console.error('Error fetching customer points:', error);
        return;
      }
      
      if (data) {
        const walletBalance = Number(data.wallet_balance) || 0;
        const cashbackBalance = Number(data.cashback_balance) || 0;
        
        console.log('Fetched wallet balance:', walletBalance);
        console.log('Fetched cashback balance:', cashbackBalance);
        
        setCustomerPoints({
          walletBalance,
          cashbackBalance
        });

        // Don't auto-transfer here to avoid looping, we'll do that in a separate effect
      }
    } catch (error) {
      console.error('Unexpected error fetching customer points:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const autoTransferCashbackToWallet = async (cashbackAmount: number) => {
    if (!customerId || cashbackAmount <= 0 || autoTransferInProgressRef.current) return;
    
    try {
      autoTransferInProgressRef.current = true;
      console.log('Auto-transferring cashback to wallet:', cashbackAmount);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('wallet_balance, cashback_balance')
        .eq('id', customerId)
        .single();

      if (fetchError) {
        console.error('Error fetching latest points for transfer:', fetchError);
        return;
      }
      
      const currentWalletBalance = Number(data.wallet_balance) || 0;
      const currentCashbackBalance = Number(data.cashback_balance) || 0;
      
      if (currentCashbackBalance <= 0) {
        console.log('No cashback balance to transfer');
        return;
      }

      const newWalletBalance = currentWalletBalance + currentCashbackBalance;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          cashback_balance: 0,
          wallet_balance: newWalletBalance
        })
        .eq('id', customerId);
      
      if (updateError) {
        console.error('Error transferring cashback to wallet:', updateError);
        return;
      }
      
      setCustomerPoints({
        walletBalance: newWalletBalance,
        cashbackBalance: 0
      });
      
      console.log('Successfully auto-transferred cashback to wallet. New wallet balance:', newWalletBalance);
    } catch (error) {
      console.error('Unexpected error during auto-transfer:', error);
    } finally {
      autoTransferInProgressRef.current = false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchCustomerPoints();
    } else {
      setCustomerPoints(null);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId && customerPoints && customerPoints.cashbackBalance > 0 && !autoTransferInProgressRef.current) {
      autoTransferCashbackToWallet(customerPoints.cashbackBalance);
    }
  }, [customerId, customerPoints?.cashbackBalance]);

  const isEligibleItem = (itemId: string, type: 'service' | 'package') => {
    if (!settings) return false;
    
    if (settings.apply_to_all) return true;
    
    if (type === 'service' && settings.applicable_services) {
      return settings.applicable_services.includes(itemId);
    }
    
    if (type === 'package' && settings.applicable_packages) {
      return settings.applicable_packages.includes(itemId);
    }
    
    return false;
  };

  const getEligibleAmount = (
    selectedServices: string[],
    selectedPackages: string[],
    services: any[],
    packages: any[],
    subtotal: number
  ): number => {
    if (!settings || !settings.enabled) return 0;
    
    if (settings.min_billing_amount && subtotal < settings.min_billing_amount) {
      return 0;
    }
    
    if (settings.apply_to_all) return subtotal;
    
    let eligibleAmount = 0;
    
    selectedServices.forEach(serviceId => {
      if (isEligibleItem(serviceId, 'service')) {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          eligibleAmount += service.selling_price;
        }
      }
    });
    
    selectedPackages.forEach(packageId => {
      if (isEligibleItem(packageId, 'package')) {
        const pkg = packages.find(p => p.id === packageId);
        if (pkg) {
          eligibleAmount += pkg.price;
        }
      }
    });
    
    return eligibleAmount;
  };

  const calculatePointsFromAmount = (amount: number): number => {
    if (!settings || !settings.enabled) return 0;
    return Math.floor(amount * settings.points_per_spend);
  };

  const calculateAmountFromPoints = (points: number): number => {
    if (!settings || !settings.enabled) return 0;
    return points * settings.point_value;
  };

  const hasMinimumForRedemption = (points: CustomerPoints | null): boolean => {
    if (!settings || !settings.enabled || !points) return false;
    return points.walletBalance >= settings.min_redemption_points;
  };

  const getMaxRedeemablePoints = (subtotal: number): number => {
    if (!settings || !settings.enabled || !customerPoints) return 0;
    
    if (!hasMinimumForRedemption(customerPoints)) {
      return 0;
    }
    
    console.log('Calculating max redeemable points with settings:', settings);
    console.log('Customer wallet balance:', customerPoints.walletBalance);
    console.log('Subtotal for calculation:', subtotal);
    
    let maxPoints = customerPoints.walletBalance;
    
    const maxAmountFromPoints = maxPoints * settings.point_value;
    console.log('Maximum amount possible from points:', maxAmountFromPoints);
    
    if (settings.max_redemption_type === "fixed" && settings.max_redemption_points) {
      maxPoints = Math.min(maxPoints, settings.max_redemption_points);
      console.log('Limited by fixed max points:', maxPoints);
    } 
    else if (settings.max_redemption_type === "percentage" && settings.max_redemption_percentage) {
      const maxDiscountAmount = subtotal * (settings.max_redemption_percentage / 100);
      const pointsEquivalent = Math.floor(maxDiscountAmount / settings.point_value);
      maxPoints = Math.min(maxPoints, pointsEquivalent);
      console.log('Limited by percentage max:', maxPoints, 'from max discount amount:', maxDiscountAmount);
    }
    
    const pointsForFullSubtotal = Math.floor(subtotal / settings.point_value);
    maxPoints = Math.min(maxPoints, pointsForFullSubtotal);
    console.log('Limited by subtotal:', maxPoints);
    
    if (maxPoints < settings.min_redemption_points) {
      console.log('Below minimum redemption points, returning 0');
      return 0;
    }
    
    return maxPoints;
  };

  const transferPointsToWallet = async (pointsToTransfer: number): Promise<boolean> => {
    if (!customerId || !customerPoints) return false;
    
    try {
      setIsLoading(true);
      
      if (pointsToTransfer > customerPoints.cashbackBalance) {
        toast.error(`Cannot transfer more than available cashback balance (${customerPoints.cashbackBalance} points)`);
        return false;
      }
      
      if (settings?.min_redemption_points && pointsToTransfer < settings.min_redemption_points) {
        toast.error(`Minimum transfer amount is ${settings.min_redemption_points} points`);
        return false;
      }
      
      const newCashbackBalance = customerPoints.cashbackBalance - pointsToTransfer;
      const newWalletBalance = customerPoints.walletBalance + pointsToTransfer;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          cashback_balance: newCashbackBalance,
          wallet_balance: newWalletBalance
        })
        .eq('id', customerId);
      
      if (error) {
        console.error('Error transferring points to wallet:', error);
        toast.error('Failed to transfer points to wallet');
        return false;
      }
      
      setCustomerPoints({
        cashbackBalance: newCashbackBalance,
        walletBalance: newWalletBalance
      });
      
      toast.success(`Successfully transferred ${pointsToTransfer} points to wallet`);
      return true;
    } catch (error) {
      console.error('Unexpected error transferring points:', error);
      toast.error('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    settings,
    customerPoints,
    isLoading,
    fetchSettings,
    fetchCustomerPoints,
    isEligibleForPoints: isEligibleItem,
    getEligibleAmount,
    calculatePointsFromAmount,
    calculateAmountFromPoints,
    hasMinimumForRedemption,
    getMaxRedeemablePoints,
    transferPointsToWallet,
    walletBalance: customerPoints?.walletBalance || 0,
    cashbackBalance: customerPoints?.cashbackBalance || 0,
    autoTransferCashbackToWallet
  };
}
