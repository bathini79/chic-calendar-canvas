import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Service, Package } from "@/pages/admin/bookings/types";

interface LoyaltyProgramSettings {
  id: string;
  enabled: boolean;
  points_per_spend: number;
  point_value: number;
  min_redemption_points: number;
  min_billing_amount?: number | null;
  apply_to_all: boolean;
  applicable_services?: string[] | null;
  applicable_packages?: string[] | null;
  points_validity_days?: number | null;
  cashback_validity_days?: number | null;
}

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
        
        setSettings(settingsData);
        
        // Program is eligible if it's enabled
        setIsEligibleForPoints(settingsData?.enabled || false);
        
        // If we have a customer ID, fetch their points balance
        if (customerId && settingsData?.enabled) {
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
    canEarnPoints
  };
}
