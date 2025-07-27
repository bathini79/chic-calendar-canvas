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
  referralWallet: {
    referralWalletToRedeem: number;
    referralWalletDiscountAmount: number;
  };
  referrerId?: string | null;
  referralCashback?: number;
  customerCashback?: number;
  isReferralApplicable?: boolean;
  subtotal?: number;
  total: number;
  adjustedPrices: Record<string, number>;
  onSaveAppointment: (params?: any) => Promise<string | null>;
  onPaymentComplete: (appointmentId?: string) => void;
  setLoading?: (loading: boolean) => void;
}

export const usePaymentHandler = ({
  selectedCustomer,
  paymentMethod,
  appointmentId,  
  taxes,
  coupons,
  membership,  
  loyalty,
  referralWallet,
  referrerId,
  referralCashback,
  customerCashback,
  isReferralApplicable,
  subtotal,
  total,
  adjustedPrices,
  onSaveAppointment,
  onPaymentComplete,
  setLoading,
}: UsePaymentHandlerProps) => {const handlePayment = async () => {
    try {
      console.log("Payment handler started");
      
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        if (setLoading) setLoading(false);
        return;
      }

      if (!paymentMethod) {
        toast.error("Please select a payment method");
        if (setLoading) setLoading(false);
        return;
      }
      
      // Set loading state to true at the start of payment processing
      // This is now redundant as we're setting it in the button click handler,
      // but keeping it for safety
      if (setLoading) {
        setLoading(true);
      }
      
      console.log("Payment validation passed");const roundedTotal = Math.round(total);
      const roundOffDifference = roundedTotal - total;      const saveAppointmentParams = {
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
        subtotal: subtotal, // Add the subtotal for proper referral wallet handling
        total: roundedTotal, // Save the rounded total
        roundOffDifference, // Save the round-off difference
        adjustedPrices, // Don't merge with loyalty.adjustedServicePrices
        paymentMethod,
        pointsEarned: loyalty.pointsToEarn,
        pointsRedeemed: loyalty.pointsToRedeem,
        pointsDiscountAmount: loyalty.pointsDiscountAmount,
        referralWalletRedeemed: referralWallet.referralWalletToRedeem,
        referralWalletDiscountAmount: referralWallet.referralWalletDiscountAmount,
        // Add referral information if applicable
        referrerId: isReferralApplicable ? referrerId : null,
        referralCashback: isReferralApplicable && referrerId ? referralCashback : 0,
        customerCashback: isReferralApplicable && referrerId ? customerCashback : 0
      };      console.log("About to save appointment with params:", saveAppointmentParams);
      
      // Make sure onSaveAppointment is safely handled
      let savedAppointmentId;
      try {
        savedAppointmentId = await onSaveAppointment(saveAppointmentParams);
        console.log("Saved appointment ID:", savedAppointmentId);
      } catch (saveError) {
        console.error("Error in onSaveAppointment:", saveError);
        toast.error("Failed to save appointment");
        if (setLoading) setLoading(false);
        return;
      }
      
      if (!savedAppointmentId) {
        console.error("No appointment ID returned from save operation");
        toast.error("Failed to complete payment - no appointment ID returned");
        if (setLoading) setLoading(false);
        return;
      }

      toast.success("Payment completed successfully");
      
      try {
        await onPaymentComplete(savedAppointmentId);
        console.log("Payment completion callback executed successfully");
      } catch (callbackError) {
        console.error("Error in payment completion callback:", callbackError);
        // Don't show an error to the user here as the payment actually succeeded
      }
      
      // Reset loading state on successful completion
      if (setLoading) {
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error completing payment:", error);
      toast.error(error.message || "Failed to complete payment");
      
      // Ensure loading state is reset even on error
      if (setLoading) {
        setLoading(false);
      }
    }
  };

  return {
    handlePayment
  };
};