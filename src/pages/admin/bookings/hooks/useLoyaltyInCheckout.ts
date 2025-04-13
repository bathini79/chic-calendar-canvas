import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseLoyaltyInCheckoutProps {
  customerId?: string;
  selectedServices: string[];
  selectedPackages: string[];
  services: any[];
  packages: any[];
  subtotal: number;
  discountedSubtotal: number;
}

interface UseLoyaltyInCheckoutResult {
  isLoyaltyEnabled: boolean;
  pointsToEarn: number;
  walletBalance: number;
  cashbackBalance: number;
  usePoints: boolean;
  pointsToRedeem: number;
  pointsDiscountAmount: number;
  maxPointsToRedeem: number;
  minRedemptionPoints: number;
  pointValue: number;
  maxRedemptionType: "fixed" | "percentage" | null;
  maxRedemptionValue: number | null;
  setUsePoints: (usePoints: boolean) => void;
  setPointsToRedeem: (points: number) => void;
  customerPoints: { walletBalance: number; cashbackBalance: number } | null;
}

interface LoyaltySettings {
  id: string;
  enabled: boolean;
  points_per_spend: number;
  min_redemption_points: number;
  min_billing_amount: number | null;
  points_validity_days: number | null;
  cashback_validity_days: number | null;
  apply_to_all: boolean;
  applicable_services: string[] | null;
  applicable_packages: string[] | null;
  max_redemption_type: "fixed" | "percentage" | null;
  max_redemption_points: number | null;
  max_redemption_percentage: number | null;
}

export function useLoyaltyInCheckout({
  customerId,
  selectedServices,
  selectedPackages,
  services,
  packages,
  subtotal,
  discountedSubtotal,
}: UseLoyaltyInCheckoutProps): UseLoyaltyInCheckoutResult {
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [customerPoints, setCustomerPoints] = useState<{ walletBalance: number; cashbackBalance: number } | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('loyalty_program_settings')
          .select('*')
          .single();
        
        if (error) {
          console.error('Error fetching loyalty settings:', error);
          return;
        }
        
        if (data) {
          setSettings(data as LoyaltySettings);
        }
      } catch (error) {
        console.error('Error fetching loyalty settings:', error);
      }
    };
    
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchCustomerPoints = async () => {
      if (!customerId) {
        setCustomerPoints(null);
        return;
      }
      
      try {
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
          setCustomerPoints({
            walletBalance: Number(data.wallet_balance) || 0,
            cashbackBalance: Number(data.cashback_balance) || 0
          });
        }
      } catch (error) {
        console.error('Error fetching customer points:', error);
      }
    };
    
    fetchCustomerPoints();
  }, [customerId]);

  useEffect(() => {
    if (!usePoints) {
      setPointsToRedeem(0);
    } else if (settings && customerPoints) {
      const minPoints = settings.min_redemption_points || 0;
      if (minPoints > 0 && customerPoints.walletBalance >= minPoints) {
        setPointsToRedeem(minPoints);
      }
    }
  }, [usePoints, settings, customerPoints]);

  const getEligibleAmount = (): number => {
    if (!settings || !settings.enabled) return 0;
    
    if (settings.min_billing_amount !== null && subtotal < settings.min_billing_amount) {
      return 0;
    }
    
    if (settings.apply_to_all) return subtotal;
    
    let eligibleAmount = 0;
    
    for (const serviceId of selectedServices) {
      if (settings.applicable_services?.includes(serviceId)) {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          eligibleAmount += service.selling_price;
        }
      }
    }
    
    for (const packageId of selectedPackages) {
      if (settings.applicable_packages?.includes(packageId)) {
        const pkg = packages.find(p => p.id === packageId);
        if (pkg) {
          eligibleAmount += pkg.price;
        }
      }
    }
    
    return eligibleAmount;
  };

  const calculatePointsToEarn = (): number => {
    if (!settings || !settings.enabled) return 0;
    
    const eligibleAmount = getEligibleAmount();
    if (eligibleAmount <= 0) return 0;
    
    const points = Math.floor(eligibleAmount * (settings.points_per_spend / 100));
    return points;
  };

  const calculateMaxPointsToRedeem = (): number => {
    if (!settings || !settings.enabled || !customerPoints) return 0;
    
    const { walletBalance } = customerPoints;
    
    if (walletBalance < (settings.min_redemption_points || 0)) {
      return 0;
    }
    
    let maxPoints = walletBalance;
    
    if (settings.max_redemption_type === 'fixed' && settings.max_redemption_points) {
      maxPoints = Math.min(maxPoints, settings.max_redemption_points);
    } else if (settings.max_redemption_type === 'percentage' && settings.max_redemption_percentage) {
      const maxDiscountAmount = discountedSubtotal * (settings.max_redemption_percentage / 100);
      const maxPointsByPercentage = Math.floor(maxDiscountAmount);
      maxPoints = Math.min(maxPoints, maxPointsByPercentage);
    }
    
    const pointsForFullSubtotal = Math.ceil(discountedSubtotal);
    maxPoints = Math.min(maxPoints, pointsForFullSubtotal);
    
    if (maxPoints < (settings.min_redemption_points || 0)) {
      return 0;
    }
    
    return maxPoints;
  };

  const calculatePointsDiscountAmount = (): number => {
    if (!usePoints || pointsToRedeem <= 0) return 0;
    
    return pointsToRedeem;
  };

  const pointValue = 1;

  const pointsToEarn = calculatePointsToEarn();
  const maxPointsToRedeem = calculateMaxPointsToRedeem();
  const pointsDiscountAmount = calculatePointsDiscountAmount();

  const minRedemptionPoints = settings?.min_redemption_points || 0;

  return {
    isLoyaltyEnabled: !!settings?.enabled,
    pointsToEarn,
    walletBalance: customerPoints?.walletBalance || 0,
    cashbackBalance: customerPoints?.cashbackBalance || 0,
    usePoints,
    pointsToRedeem,
    pointsDiscountAmount,
    maxPointsToRedeem,
    minRedemptionPoints,
    pointValue,
    maxRedemptionType: settings?.max_redemption_type || null,
    maxRedemptionValue: settings?.max_redemption_type === 'fixed' 
      ? settings.max_redemption_points 
      : settings?.max_redemption_type === 'percentage' 
        ? settings.max_redemption_percentage 
        : null,
    setUsePoints,
    setPointsToRedeem,
    customerPoints
  };
}
