
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Coupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  description?: string;
  is_active: boolean;
  apply_to_all: boolean;
};

export function useCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Fetching coupons from database");
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("is_active", true)
        .order("code");

      if (error) {
        console.error("Error fetching coupons:", error);
        throw error;
      }

      console.log("Coupons fetched successfully:", data);
      setCoupons(data || []);
      return data;
    } catch (error: any) {
      console.error("Error in fetchCoupons:", error);
      toast.error("Failed to load coupons");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const getCouponById = useCallback(
    async (id: string) => {
      try {
        if (coupons.length > 0) {
          return coupons.find((coupon) => coupon.id === id);
        }

        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        return data;
      } catch (error: any) {
        console.error("Error fetching coupon by ID:", error);
        return null;
      }
    },
    [coupons]
  );

  const validateCouponCode = useCallback(
    async (code: string) => {
      try {
        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("code", code)
          .eq("is_active", true)
          .single();

        if (error) throw error;
        return data;
      } catch (error: any) {
        console.error("Error validating coupon code:", error);
        return null;
      }
    },
    []
  );

  return {
    coupons,
    isLoading,
    fetchCoupons,
    getCouponById,
    validateCouponCode,
  };
}
