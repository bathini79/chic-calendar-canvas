
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Coupon = {
  id: string;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  apply_to_all: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CouponService = {
  coupon_id: string;
  service_id: string;
};

export function useCoupons() {
  const [isLoading, setIsLoading] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  async function fetchCoupons() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("code");

      if (error) throw error;
      setCoupons(data || []);
      return data;
    } catch (error: any) {
      toast.error(`Error fetching coupons: ${error.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  async function createCoupon(newCoupon: Omit<Coupon, "id">) {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("coupons")
        .insert([newCoupon])
        .select()
        .single();

      if (error) throw error;
      toast.success("Coupon created successfully");
      await fetchCoupons();
      return data;
    } catch (error: any) {
      toast.error(`Error creating coupon: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateCoupon(id: string, updatedCoupon: Partial<Coupon>) {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("coupons")
        .update(updatedCoupon)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      toast.success("Coupon updated successfully");
      await fetchCoupons();
      return data;
    } catch (error: any) {
      toast.error(`Error updating coupon: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteCoupon(id: string) {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Coupon deleted successfully");
      await fetchCoupons();
    } catch (error: any) {
      toast.error(`Error deleting coupon: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function getCouponServices(couponId: string) {
    try {
      const { data, error } = await supabase
        .from("coupon_services")
        .select("service_id")
        .eq("coupon_id", couponId);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast.error(`Error fetching coupon services: ${error.message}`);
      return [];
    }
  }

  async function saveCouponServices(couponId: string, serviceIds: string[]) {
    try {
      setIsLoading(true);
      
      // Delete existing relationships
      const { error: deleteError } = await supabase
        .from("coupon_services")
        .delete()
        .eq("coupon_id", couponId);
      
      if (deleteError) throw deleteError;
      
      // If there are services to add
      if (serviceIds.length > 0) {
        // Create the relationships array
        const relationships = serviceIds.map(serviceId => ({
          coupon_id: couponId,
          service_id: serviceId
        }));
        
        // Insert new relationships
        const { error: insertError } = await supabase
          .from("coupon_services")
          .insert(relationships);
        
        if (insertError) throw insertError;
      }
      
      toast.success("Coupon services updated successfully");
    } catch (error: any) {
      toast.error(`Error saving coupon services: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    coupons,
    isLoading,
    fetchCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponServices,
    saveCouponServices
  };
}
