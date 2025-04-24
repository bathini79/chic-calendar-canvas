import { toast } from "sonner";
import type { Customer } from "../types";

interface UsePaymentHandlerProps {
  selectedCustomer: Customer | null;
  paymentMethod: string;
  appointmentId?: string;
  taxes: {
    appliedTaxId: string | null;
    taxAmount: number;
  };
  coupons: {
    selectedCouponId: string | null;
    couponDiscount: number;
    availableCoupons: any[];
  };
  membership: {
    membershipId: string | null;
    membershipName: string | null;
    membershipDiscount: number;
  };
  loyalty: {
    adjustedServicePrices: Record<string, number>;
    pointsToEarn: number;
    pointsToRedeem: number;
    pointsDiscountAmount: number;
  };
  total: number;
  adjustedPrices: Record<string, number>;
  onSaveAppointment: (params?: any) => Promise<string | null>;
  onPaymentComplete: (appointmentId?: string) => void;
}

export const usePaymentHandler = ({
  selectedCustomer,
  paymentMethod,
  appointmentId,
  taxes,
  coupons,
  membership,
  loyalty,
  total,
  adjustedPrices,
  onSaveAppointment,
  onPaymentComplete,
}: UsePaymentHandlerProps) => {
  const handlePayment = async () => {
    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }

      if (!paymentMethod) {
        toast.error("Please select a payment method");
        return;
      }

      const roundedTotal = Math.round(total);
      const roundOffDifference = roundedTotal - total;

      const saveAppointmentParams = {
        appointmentId,
        appliedTaxId: taxes.appliedTaxId,
        taxAmount: taxes.taxAmount,
        couponId: coupons.selectedCouponId,
        couponDiscount: coupons.couponDiscount,
        couponName: coupons.availableCoupons?.filter(
          (c) => c.id === coupons.selectedCouponId
        )?.[0]?.code || null,
        membershipId: membership.membershipId,
        membershipName: membership.membershipName,
        membershipDiscount: membership.membershipDiscount,
        total: roundedTotal, // Save the rounded total
        roundOffDifference, // Save the round-off difference
        adjustedPrices, // Don't merge with loyalty.adjustedServicePrices
        paymentMethod,
        pointsEarned: loyalty.pointsToEarn,
        pointsRedeemed: loyalty.pointsToRedeem,
        pointsDiscountAmount: loyalty.pointsDiscountAmount
      };

      const savedAppointmentId = await onSaveAppointment(saveAppointmentParams);
      if (!savedAppointmentId) {
        toast.error("Failed to complete payment");
        return;
      }

      toast.success("Payment completed successfully");
      onPaymentComplete(savedAppointmentId);
    } catch (error: any) {
      console.error("Error completing payment:", error);
      toast.error(error.message || "Failed to complete payment");
    }
  };

  return {
    handlePayment
  };
};