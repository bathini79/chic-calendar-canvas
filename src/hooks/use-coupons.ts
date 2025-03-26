
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Coupon = {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);

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
      setCoupons(data as Coupon[] || []);
      setFilteredCoupons(data as Coupon[] || []);
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

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCoupons(coupons);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = coupons.filter(
        coupon => coupon.code.toLowerCase().includes(query) || 
                 (coupon.description && coupon.description.toLowerCase().includes(query))
      );
      setFilteredCoupons(filtered);
    }
  }, [searchQuery, coupons]);

  const getCouponById = useCallback(
    async (id: string) => {
      try {
        if (!id) {
          console.log("No coupon ID provided");
          return null;
        }
        
        console.log("Looking for coupon with ID:", id, "in cache:", coupons);
        if (coupons.length > 0) {
          const cachedCoupon = coupons.find((coupon) => coupon.id === id);
          if (cachedCoupon) {
            console.log("Found cached coupon:", cachedCoupon);
            return cachedCoupon;
          }
        }

        console.log("Fetching coupon directly from database");
        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Database error fetching coupon:", error);
          throw error;
        }
        
        console.log("Retrieved coupon from DB:", data);
        return data as Coupon;
      } catch (error: any) {
        console.error("Error fetching coupon by ID:", error);
        return null;
      }
    },
    [coupons]
  );

  const validateCouponCode = useCallback(
    async (code: string) => {
      if (!code) {
        console.log("No coupon code provided");
        return null;
      }
      
      try {
        console.log("Validating coupon code:", code);
        
        // First check in local cache
        if (coupons.length > 0) {
          const cachedCoupon = coupons.find(
            (coupon) => coupon.code.toLowerCase() === code.toLowerCase() && coupon.is_active
          );
          
          if (cachedCoupon) {
            console.log("Valid coupon found in cache:", cachedCoupon);
            return cachedCoupon;
          }
        }
        
        // If not found locally, check the database
        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("code", code)
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          console.error("Error validating coupon code:", error);
          throw error;
        }
        
        if (data) {
          console.log("Valid coupon found:", data);
          return data as Coupon;
        } else {
          console.log("No valid coupon found for code:", code);
          return null;
        }
      } catch (error: any) {
        console.error("Error validating coupon code:", error);
        return null;
      }
    },
    [coupons]
  );

  const calculateCouponDiscount = useCallback((coupon: Coupon, subtotal: number) => {
    if (!coupon) return 0;
    
    return coupon.discount_type === 'percentage'
      ? subtotal * (coupon.discount_value / 100)
      : Math.min(coupon.discount_value, subtotal);
  }, []);

  return {
    coupons,
    filteredCoupons,
    isLoading,
    searchQuery,
    setSearchQuery,
    fetchCoupons,
    getCouponById,
    validateCouponCode,
    calculateCouponDiscount
  };
}
