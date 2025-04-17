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

  const calculatePointsFromAmount = useCallback((amount: number): number => {
    if (!settings || !settings.enabled) return 0;
    return Math.floor(amount * (settings.points_per_spend / 100));
  }, [settings]);

  const calculateAmountFromPoints = useCallback((points: number): number => {
    if (!settings || !settings.enabled || !settings.points_per_spend) return 0;
    const pointValue = 100 / settings.points_per_spend;
    return points * (pointValue / 100);
  }, [settings]);

  const hasMinimumForRedemption = useCallback((points: CustomerPoints | null): boolean => {
    if (!settings || !settings.enabled || !points) return false;
    return points.walletBalance >= settings.min_redemption_points;
  }, [settings]);

  const getMaxRedeemablePoints = useCallback((amount: number): number => {
    if (!settings?.enabled || !settings.points_per_spend) return 0;

    const maxPoints = Math.floor(amount * settings.points_per_spend / 100);
    
    if (settings.max_redemption_type === "fixed") {
      return Math.min(maxPoints, settings.max_redemption_points || maxPoints);
    } else if (settings.max_redemption_type === "percentage") {
      const maxPointsByPercentage = Math.floor((amount * (settings.max_redemption_percentage || 100)) / 100 * settings.points_per_spend / 100);
      return Math.min(maxPoints, maxPointsByPercentage);
    }
    
    return maxPoints;
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
