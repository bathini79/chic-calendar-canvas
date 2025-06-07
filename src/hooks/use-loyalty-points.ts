
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoyaltyProgramSettings } from "@/pages/admin/bookings/types";

interface CustomerPoints {
  walletBalance: number;
  lastUsed: Date | null;
}

export function useLoyaltyPoints(customerId?: string) {
  // Fetch loyalty program settings with React Query
  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsError
  } = useQuery({
    queryKey: ['loyalty-program-settings'],
    queryFn: async (): Promise<LoyaltyProgramSettings | null> => {
      try {
        const { data, error } = await supabase
          .from('loyalty_program_settings')
          .select('*')
          .single();
        
        if (error) {
          console.error('Error fetching loyalty settings:', error);
          // Return default disabled settings
          return {
            id: 'default',
            enabled: false,
            points_per_spend: 1,
            point_value: 1,
            min_redemption_points: 100,
            min_billing_amount: null,
            apply_to_all: true,
            applicable_services: [],
            applicable_packages: [],
            points_validity_days: null,
            cashback_validity_days: null,
            max_redemption_type: null,
            max_redemption_points: null,
            max_redemption_percentage: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as LoyaltyProgramSettings;
        }
        
        if (data) {
          return {
            ...data,
            point_value: (data as any).point_value || 1,
            cashback_validity_days: (data as any).cashback_validity_days || null
          } as LoyaltyProgramSettings;
        }
        
        return null;
      } catch (error) {
        console.error('Unexpected error fetching loyalty settings:', error);
        // Return safe defaults
        return {
          id: 'default',
          enabled: false,
          points_per_spend: 1,
          point_value: 1,
          min_redemption_points: 100,
          min_billing_amount: null,
          apply_to_all: true,
          applicable_services: [],
          applicable_packages: [],
          points_validity_days: null,
          cashback_validity_days: null,
          max_redemption_type: null,
          max_redemption_points: null,
          max_redemption_percentage: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as LoyaltyProgramSettings;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: {
      id: 'placeholder',
      enabled: false,
      points_per_spend: 1,
      point_value: 1,
      min_redemption_points: 100,
      min_billing_amount: null,
      apply_to_all: true,
      applicable_services: [],
      applicable_packages: [],
      points_validity_days: null,
      cashback_validity_days: null,
      max_redemption_type: null,
      max_redemption_points: null,
      max_redemption_percentage: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as LoyaltyProgramSettings
  });

  // Fetch customer points with React Query
  const {
    data: customerPoints,
    isLoading: pointsLoading,
    error: pointsError
  } = useQuery({
    queryKey: ['customer-points', customerId],
    queryFn: async (): Promise<CustomerPoints | null> => {
      if (!customerId) {
        return null;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('wallet_balance, last_used')
          .eq('id', customerId)
          .single();
        
        if (error) {
          console.error('Error fetching customer points:', error);
          return {
            walletBalance: 0,
            lastUsed: null
          };
        }
        
        if (data) {
          let walletBalance = Number(data.wallet_balance) || 0;
          const lastUsed = data.last_used ? new Date(data.last_used) : null;
          
          // Check if points have expired
          if (lastUsed && settings?.points_validity_days) {
            const expiryDate = new Date(lastUsed);
            expiryDate.setDate(expiryDate.getDate() + settings.points_validity_days);
            
            if (expiryDate < new Date()) {
              walletBalance = 0;
            }
          }
          
          return {
            walletBalance,
            lastUsed
          };
        }
        
        return {
          walletBalance: 0,
          lastUsed: null
        };
      } catch (error) {
        console.error('Unexpected error fetching customer points:', error);
        return {
          walletBalance: 0,
          lastUsed: null
        };
      }
    },
    enabled: !!customerId, // Only run if customerId is provided
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  const isLoading = settingsLoading || pointsLoading;

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
