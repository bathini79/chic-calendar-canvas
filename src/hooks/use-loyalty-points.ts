import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Service, Package, LoyaltyProgramSettings } from "@/pages/admin/bookings/types";

interface UseLoyaltyPointsResult {
  isLoading: boolean;
  settings: LoyaltyProgramSettings | null;
  isEligibleForPoints: boolean;
  estimatedPoints: number;
  customerPoints: number | null;
  getEligibleAmount: (
    selectedServices: string[],
    selectedPackages: string[],
    services: Service[],
    packages: Package[],
    subtotal: number
  ) => number;
  isServiceEligible: (serviceId: string) => boolean;
  isPackageEligible: (packageId: string) => boolean;
  calculatePointsFromAmount: (amount: number) => number;
  calculateAmountFromPoints: (points: number) => number;
  hasMinimumForRedemption: (points: number) => boolean;
  canEarnPoints: (amount: number) => boolean;
  getMaxRedeemablePoints: (subtotal: number) => number;
}

export function useLoyaltyPoints(customerId?: string): UseLoyaltyPointsResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<LoyaltyProgramSettings | null>(null);
  const [isEligibleForPoints, setIsEligibleForPoints] = useState<boolean>(false);
  const [estimatedPoints, setEstimatedPoints] = useState<number>(0);
  const [customerPoints, setCustomerPoints] = useState<number | null>(null);

  useEffect(() => {
    const fetchLoyaltySettings = async () => {
      try {
        setIsLoading(true);
        
        // Fetch the loyalty program settings
        const { data: settingsData, error: settingsError } = await supabase
          .from("loyalty_program_settings")
          .select("*")
          .single();
        
        if (settingsError) {
          console.error("Error fetching loyalty settings:", settingsError);
          return;
        }
        
        if (settingsData) {
          // Convert the data to the expected LoyaltyProgramSettings type
          const typedSettings: LoyaltyProgramSettings = {
            id: settingsData.id,
            enabled: settingsData.enabled,
            points_per_spend: settingsData.points_per_spend,
            point_value: settingsData.point_value,
            min_redemption_points: settingsData.min_redemption_points,
            min_billing_amount: settingsData.min_billing_amount,
            apply_to_all: settingsData.apply_to_all,
            applicable_services: settingsData.applicable_services,
            applicable_packages: settingsData.applicable_packages,
            points_validity_days: settingsData.points_validity_days,
            cashback_validity_days: settingsData.cashback_validity_days,
            max_redemption_type: settingsData.max_redemption_type,
            max_redemption_points: settingsData.max_redemption_points,
            max_redemption_percentage: settingsData.max_redemption_percentage
          };
          
          setSettings(typedSettings);
          
          // Program is eligible if it's enabled
          setIsEligibleForPoints(typedSettings?.enabled || false);
          
          // If we have a customer ID, fetch their points balance
          if (customerId && typedSettings?.enabled) {
            const { data: customerData, error: customerError } = await supabase
              .from("profiles")
              .select("wallet_balance, cashback_balance")
              .eq("id", customerId)
              .single();
              
            if (customerError) {
              console.error("Error fetching customer points:", customerError);
            } else {
              // Use wallet_balance as the available points
              setCustomerPoints(customerData?.wallet_balance || 0);
            }
          }
        }
      } catch (error) {
        console.error("Unexpected error in useLoyaltyPoints:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLoyaltySettings();
  }, [customerId]);

  /**
   * Checks if a service is eligible for loyalty points
   */
  const isServiceEligible = (serviceId: string): boolean => {
    if (!settings || !settings.enabled) return false;
    
    // If apply_to_all is true, all services are eligible
    if (settings.apply_to_all) return true;
    
    // Otherwise, check if this service is in the applicable_services array
    return Boolean(
      settings.applicable_services && 
      settings.applicable_services.includes(serviceId)
    );
  };

  /**
   * Checks if a package is eligible for loyalty points
   */
  const isPackageEligible = (packageId: string): boolean => {
    if (!settings || !settings.enabled) return false;
    
    // If apply_to_all is true, all packages are eligible
    if (settings.apply_to_all) return true;
    
    // Otherwise, check if this package is in the applicable_packages array
    return Boolean(
      settings.applicable_packages && 
      settings.applicable_packages.includes(packageId)
    );
  };

  /**
   * Calculates the eligible amount from the selected services and packages
   */
  const getEligibleAmount = (
    selectedServices: string[],
    selectedPackages: string[],
    services: Service[],
    packages: Package[],
    subtotal: number
  ): number => {
    if (!settings || !settings.enabled) return 0;
    
    // If apply_to_all is true, the entire subtotal is eligible
    if (settings.apply_to_all) return subtotal;
    
    // Otherwise, calculate the eligible amount by summing up eligible services and packages
    let eligibleAmount = 0;
    
    // Add eligible services
    selectedServices.forEach(serviceId => {
      if (isServiceEligible(serviceId)) {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          eligibleAmount += service.selling_price;
        }
      }
    });
    
    // Add eligible packages
    selectedPackages.forEach(packageId => {
      if (isPackageEligible(packageId)) {
        const pkg = packages.find(p => p.id === packageId);
        if (pkg) {
          eligibleAmount += pkg.price;
        }
      }
    });
    
    return eligibleAmount;
  };

  /**
   * Calculates points from a given amount
   */
  const calculatePointsFromAmount = (amount: number): number => {
    if (!settings || !settings.enabled) return 0;
    
    // Check if there's a minimum billing amount and the amount meets it
    if (settings.min_billing_amount && amount < settings.min_billing_amount) {
      return 0;
    }
    
    // Calculate points based on the points_per_spend rate
    return Math.floor(amount * settings.points_per_spend);
  };

  /**
   * Calculates amount from a given number of points
   */
  const calculateAmountFromPoints = (points: number): number => {
    if (!settings || !settings.enabled) return 0;
    
    return points * settings.point_value;
  };

  /**
   * Checks if the points meet the minimum required for redemption
   */
  const hasMinimumForRedemption = (points: number): boolean => {
    if (!settings || !settings.enabled) return false;
    
    return points >= settings.min_redemption_points;
  };

  /**
   * Checks if an amount is eligible for earning points
   */
  const canEarnPoints = (amount: number): boolean => {
    if (!settings || !settings.enabled) return false;
    
    // Check if there's a minimum billing amount and the amount meets it
    if (settings.min_billing_amount) {
      return amount >= settings.min_billing_amount;
    }
    
    return true;
  };

  /**
   * Gets the maximum redeemable points based on settings and subtotal
   */
  const getMaxRedeemablePoints = (subtotal: number): number => {
    if (!settings || !settings.enabled || !customerPoints) return 0;
    
    // Convert subtotal to max points allowed
    const maxPointsByValue = Math.floor(subtotal / settings.point_value);
    
    // Apply max redemption settings if configured
    if (settings.max_redemption_type === "fixed" && settings.max_redemption_points) {
      // Fixed maximum points
      return Math.min(customerPoints, maxPointsByValue, settings.max_redemption_points);
    } 
    else if (settings.max_redemption_type === "percentage" && settings.max_redemption_percentage) {
      // Percentage of subtotal as maximum
      const maxDiscountAmount = subtotal * (settings.max_redemption_percentage / 100);
      const maxPointsByPercentage = Math.floor(maxDiscountAmount / settings.point_value);
      return Math.min(customerPoints, maxPointsByValue, maxPointsByPercentage);
    }
    
    // If no max redemption setting, just limit by available points and subtotal
    return Math.min(customerPoints, maxPointsByValue);
  };

  return {
    isLoading,
    settings,
    isEligibleForPoints,
    estimatedPoints,
    customerPoints,
    getEligibleAmount,
    isServiceEligible,
    isPackageEligible,
    calculatePointsFromAmount,
    calculateAmountFromPoints,
    hasMinimumForRedemption,
    canEarnPoints,
    getMaxRedeemablePoints
  };
}
