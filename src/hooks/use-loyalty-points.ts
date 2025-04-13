import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoyaltyProgramSettings } from "@/pages/admin/bookings/types";

export function useLoyaltyPoints(customerId?: string) {
  const [settings, setSettings] = useState<LoyaltyProgramSettings | null>(null);
  const [customerPoints, setCustomerPoints] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        // Ensure wallet_balance is always a number
        const walletBalance = typeof data.wallet_balance === 'number' ? data.wallet_balance : 0;
        setCustomerPoints(walletBalance);
      }
    } catch (error) {
      console.error('Unexpected error fetching customer points:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchCustomerPoints();
    }
  }, [customerId]);

  // Check if a service or package is eligible for points
  const isEligibleItem = (itemId: string, type: 'service' | 'package') => {
    if (!settings) return false;
    
    // If apply_to_all is true, all services and packages are eligible
    if (settings.apply_to_all) return true;
    
    // Otherwise, check if the specific service or package is in the applicable list
    if (type === 'service' && settings.applicable_services) {
      return settings.applicable_services.includes(itemId);
    }
    
    if (type === 'package' && settings.applicable_packages) {
      return settings.applicable_packages.includes(itemId);
    }
    
    return false;
  };

  // Calculate eligible amount for earning points
  const getEligibleAmount = (
    selectedServices: string[],
    selectedPackages: string[],
    services: any[],
    packages: any[],
    subtotal: number
  ): number => {
    if (!settings || !settings.enabled) return 0;
    
    // If there's a minimum billing amount and subtotal is less than that, return 0
    if (settings.min_billing_amount && subtotal < settings.min_billing_amount) {
      return 0;
    }
    
    // If all services and packages are eligible
    if (settings.apply_to_all) return subtotal;
    
    // Otherwise, calculate total for eligible items only
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

  // Calculate points earned from an amount
  const calculatePointsFromAmount = (amount: number): number => {
    if (!settings || !settings.enabled) return 0;
    return Math.floor(amount * settings.points_per_spend);
  };

  // Calculate amount from points to be redeemed
  const calculateAmountFromPoints = (points: number): number => {
    if (!settings || !settings.enabled) return 0;
    return points * settings.point_value;
  };

  // Check if customer has minimum points for redemption
  const hasMinimumForRedemption = (points: number): boolean => {
    if (!settings || !settings.enabled) return false;
    return points >= settings.min_redemption_points;
  };

  // Calculate max redeemable points based on settings and subtotal
  const getMaxRedeemablePoints = (subtotal: number): number => {
    if (!settings || !settings.enabled || !customerPoints) return 0;
    
    // First check if customer has minimum required points
    if (!hasMinimumForRedemption(customerPoints)) {
      return 0;
    }
    
    // Calculate maximum based on redemption type if set
    let maxPoints = customerPoints;
    
    if (settings.max_redemption_type === "fixed" && settings.max_redemption_points) {
      maxPoints = Math.min(maxPoints, settings.max_redemption_points);
    } else if (settings.max_redemption_type === "percentage" && settings.max_redemption_percentage) {
      const maxAmount = subtotal * (settings.max_redemption_percentage / 100);
      const pointsEquivalent = Math.floor(maxAmount / settings.point_value);
      maxPoints = Math.min(maxPoints, pointsEquivalent);
    }
    
    return maxPoints;
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
    getMaxRedeemablePoints
  };
}
