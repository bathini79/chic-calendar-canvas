import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseCouponsInCheckoutProps {
  subtotal: number;
}

export const useCouponsInCheckout = ({ subtotal }: UseCouponsInCheckoutProps) => {
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);

  useEffect(() => {
    const fetchCoupons = async () => {
      setIsLoadingCoupons(true);
      try {
        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("is_active", true)
          .order("code");

        if (error) throw error;
        setAvailableCoupons(data || []);
      } catch (error) {
        console.error("Error fetching coupons:", error);
      } finally {
        setIsLoadingCoupons(false);
      }
    };

    fetchCoupons();
  }, []);

  useEffect(() => {
    if (selectedCouponId && availableCoupons.length > 0) {
      const coupon = availableCoupons.find((c) => c.id === selectedCouponId);
      if (coupon) {
        setSelectedCoupon(coupon);

        const discountAmount =
          coupon.discount_type === "percentage"
            ? subtotal * (coupon.discount_value / 100)
            : Math.min(coupon.discount_value, subtotal);

        setCouponDiscount(discountAmount);
      }
    } else {
      setSelectedCoupon(null);
      setCouponDiscount(0);
    }
  }, [selectedCouponId, availableCoupons, subtotal]);

  const handleCouponChange = (couponId: string) => {
    if (couponId === "none") {
      setSelectedCouponId(null);
      return;
    }
    setSelectedCouponId(couponId);
  };

  return {
    availableCoupons,
    selectedCouponId,
    selectedCoupon,
    couponDiscount,
    isLoadingCoupons,
    handleCouponChange
  };
};