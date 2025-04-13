
import { useState, useEffect, useRef } from "react";
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
        console.log('Fetched loyalty settings:', data);
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
            console.log('Points have expired on:', expiryDate);
          } else {
            console.log('Points valid until:', expiryDate);
          }
        }
        
        console.log('Fetched wallet balance:', walletBalance);
        console.log('Last used date:', lastUsed);
        
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
  }, [customerId, settings?.points_validity_days]);

  const isEligibleItem = (itemId: string, type: 'service' | 'package') => {
    if (!settings || !settings.enabled) return false;
    
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
    
    const earnedPoints = Math.floor(amount * (settings.points_per_spend / 100));
    console.log(`Calculated points from amount: ${amount} × (${settings.points_per_spend}/100) = ${earnedPoints}`);
    return earnedPoints;
  };

  const calculateAmountFromPoints = (points: number): number => {
    if (!settings || !settings.enabled || !settings.point_value) return 0;
    
    const amount = points * settings.point_value;
    console.log(`Calculated amount from points: ${points} × ${settings.point_value} = ${amount}`);
    return amount;
  };

  const hasMinimumForRedemption = (points: CustomerPoints | null): boolean => {
    if (!settings || !settings.enabled || !points) return false;
    
    const hasMinimum = points.walletBalance >= settings.min_redemption_points;
    console.log(`Checking minimum redemption: ${points.walletBalance} >= ${settings.min_redemption_points} = ${hasMinimum}`);
    return hasMinimum;
  };

  const getMaxRedeemablePoints = (subtotal: number): number => {
    if (!settings || !settings.enabled || !customerPoints || !settings.point_value) {
      console.log('Cannot calculate max redeemable points: settings not loaded, no customer points, or no point value defined');
      return 0;
    }
    
    if (!hasMinimumForRedemption(customerPoints)) {
      console.log('Customer does not meet minimum points for redemption');
      return 0;
    }
    
    console.log('Calculating max redeemable points with settings:', settings);
    console.log('Customer wallet balance:', customerPoints.walletBalance);
    console.log('Subtotal for calculation:', subtotal);
    console.log('Point value:', settings.point_value);
    
    let maxPoints = customerPoints.walletBalance;
    console.log('Starting with available points:', maxPoints);
    
    if (settings.max_redemption_type === "fixed" && settings.max_redemption_points) {
      maxPoints = Math.min(maxPoints, settings.max_redemption_points);
      console.log('Limited by fixed maximum points:', maxPoints);
    } 
    else if (settings.max_redemption_type === "percentage" && settings.max_redemption_percentage) {
      const maxDiscountAmount = subtotal * (settings.max_redemption_percentage / 100);
      const maxPointsFromPercentage = Math.floor(maxDiscountAmount / settings.point_value);
      
      maxPoints = Math.min(maxPoints, maxPointsFromPercentage);
      console.log(`Percentage limit (${settings.max_redemption_percentage}%): max points = ${maxPointsFromPercentage}`);
    }
    
    // Calculate how many points needed to cover the full subtotal
    // FIXED: Using point_value instead of points_per_spend for redemption calculation
    const maxPointsForFullSubtotal = Math.ceil(subtotal / settings.point_value);
    maxPoints = Math.min(maxPoints, maxPointsForFullSubtotal);
    console.log(`Limiting by subtotal: max points = ${maxPointsForFullSubtotal}`);
    
    if (maxPoints < settings.min_redemption_points) {
      console.log(`Max points (${maxPoints}) is below minimum redemption threshold (${settings.min_redemption_points})`);
      return 0;
    }
    
    console.log('Final max redeemable points:', maxPoints);
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
    getMaxRedeemablePoints,
    walletBalance: customerPoints?.walletBalance || 0,
    lastUsed: customerPoints?.lastUsed || null
  };
}
