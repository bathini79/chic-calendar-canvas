
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoyaltyProgramSettings } from "@/pages/admin/bookings/types";
import { toast } from "sonner";

interface CustomerPoints {
  walletBalance: number;
  lastUsed: Date | null;
}

export function useLoyaltyPoints(customerId?: string) {
  const [settings, setSettings] = useState<LoyaltyProgramSettings | null>(null);
  const [customerPoints, setCustomerPoints] = useState<CustomerPoints | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
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
  }, []);

  const fetchCustomerPoints = useCallback(async () => {
    if (!customerId) {
      setCustomerPoints(null);
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance, last_used')
        .eq('id', customerId)
        .single();
      
      if (error) {
        console.error('Error fetching customer points:', error);
        return;
      }
      
      if (data) {
        let walletBalance = Number(data.wallet_balance) || 0;
        const lastUsed = data.last_used ? new Date(data.last_used) : null;
        
        if (lastUsed && settings?.points_validity_days) {
          const expiryDate = new Date(lastUsed);
          expiryDate.setDate(expiryDate.getDate() + settings.points_validity_days);
          
          if (expiryDate < new Date()) {
            walletBalance = 0;
          }
        }
        
        setCustomerPoints({
          walletBalance,
          lastUsed
        });
      }
    } catch (error) {
      console.error('Unexpected error fetching customer points:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, settings?.points_validity_days]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (customerId) {
      fetchCustomerPoints();
    } else {
      setCustomerPoints(null);
    }
  }, [customerId, fetchCustomerPoints]);

  const isEligibleItem = useCallback((itemId: string, type: 'service' | 'package') => {
    if (!settings || !settings.enabled) return false;
    if (settings.apply_to_all) return true;
    
    if (type === 'service' && settings.applicable_services) {
      return settings.applicable_services.includes(itemId);
    }
    
    if (type === 'package' && settings.applicable_packages) {
      return settings.applicable_packages.includes(itemId);
    }
    
    return false;
  }, [settings]);

  const getEligibleAmount = useCallback((
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
  }, [settings, isEligibleItem]);

  // Calculate points to earn from an amount
  // If points_per_spend is 60, that means 60 points per ₹1 spent
  const calculatePointsFromAmount = useCallback((amount: number): number => {
    if (!settings || !settings.enabled || !settings.points_per_spend) return 0;
    
    // Calculate points based on the configured points_per_spend value
    return Math.floor(amount * settings.points_per_spend);
  }, [settings]);

  // Calculate the amount that points can redeem
  // If points_per_spend is 60, then 60 points = ₹1, so 1 point = ₹0.0166
  const calculateAmountFromPoints = useCallback((points: number): number => {
    if (!settings || !settings.enabled || !settings.points_per_spend) return 0;
    
    // Convert points to currency value
    return points / settings.points_per_spend;
  }, [settings]);

  const hasMinimumForRedemption = useCallback((points: CustomerPoints | null): boolean => {
    if (!settings || !settings.enabled || !points) return false;
    return points.walletBalance >= settings.min_redemption_points;
  }, [settings]);

  const getMaxRedeemablePoints = useCallback((amount: number): number => {
    if (!settings?.enabled || !settings.points_per_spend) return 0;

    // If no amount, no points can be redeemed
    if (amount <= 0) return 0;

    // How many points would it take to cover the transaction amount
    // If 60 points = ₹1, then covering ₹500 would take 30,000 points
    const amountInPoints = Math.floor(amount * settings.points_per_spend);

    if (settings.max_redemption_type === "fixed") {
      // For fixed maximum, use the configured maximum
      return Math.min(
        // Don't let them redeem more points than the maximum set
        settings.max_redemption_points || Number.MAX_SAFE_INTEGER,
        // Don't let them redeem more points than needed to cover the transaction
        amountInPoints
      );
    } else if (settings.max_redemption_type === "percentage" && settings.max_redemption_percentage) {
      // Calculate max discount based on percentage of transaction amount
      const maxDiscountAmount = amount * (settings.max_redemption_percentage / 100);
      // Convert back to points
      const maxPointsByPercentage = Math.floor(maxDiscountAmount * settings.points_per_spend);
      return Math.min(amountInPoints, maxPointsByPercentage);
    }
    
    // If no redemption limit set, allow up to the amount-based maximum
    return amountInPoints;
  }, [settings]);

  const memoizedValues = useMemo(() => ({
    settings,
    customerPoints,
    isLoading,
    isEligibleForPoints: isEligibleItem,
    getEligibleAmount,
    calculatePointsFromAmount,
    calculateAmountFromPoints,
    hasMinimumForRedemption,
    getMaxRedeemablePoints,
    walletBalance: customerPoints?.walletBalance || 0,
    lastUsed: customerPoints?.lastUsed || null
  }), [
    settings,
    customerPoints,
    isLoading,
    isEligibleItem,
    getEligibleAmount,
    calculatePointsFromAmount,
    calculateAmountFromPoints,
    hasMinimumForRedemption,
    getMaxRedeemablePoints
  ]);

  return memoizedValues;
}
