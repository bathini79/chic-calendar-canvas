import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment, Booking, Employee } from '../types';

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  type: 'service' | 'package';
  employee?: {
    id: string;
    name: string;
  };
  duration?: number;
}

interface LoyaltyPointsData {
  isLoyaltyEnabled: boolean;
  pointsToEarn: number;
  usePoints: boolean;
  pointsToRedeem: number;
  pointsDiscountAmount: number;
}

interface SaveAppointmentData {
  customerId: string;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  status: Appointment['status'];
  locationId: string;
  discountType: Appointment['discount_type'];
  discountValue: number;
  appliedTaxId: string | null;
  taxAmount: number;
  paymentMethod: Appointment['payment_method'];
  selectedItems: SelectedItem[];
  membershipId: string | null;
  membershipName: string | null;
  membershipDiscount: number | null;
  couponId: string | null;
  couponName: string | null;
  couponAmount: number | null;
  notes: string | null;
  loyaltyPoints?: LoyaltyPointsData;
}

export function useSaveAppointment() {
  const [isLoading, setIsLoading] = useState(false);

  const saveAppointment = async (data: SaveAppointmentData) => {
    setIsLoading(true);

    const {
      customerId,
      startTime,
      endTime,
      totalPrice,
      status,
      locationId,
      discountType,
      discountValue,
      appliedTaxId,
      taxAmount,
      paymentMethod,
      selectedItems,
      membershipId,
      membershipName,
      membershipDiscount,
      couponId,
      couponName,
      couponAmount,
      notes,
    } = data;

    try {
      if (!customerId || !startTime || !endTime || !totalPrice || !status || !locationId) {
        throw new Error('Missing required appointment data.');
      }

      const existingAppointment = null;

      // Prepare loyalty points data if applicable
      let pointsEarned = null;
      let pointsRedeemed = null;
      let pointsDiscountAmount = null;
      
      if (data.loyaltyPoints && data.loyaltyPoints.isLoyaltyEnabled) {
        pointsEarned = data.loyaltyPoints.pointsToEarn;
        
        if (data.loyaltyPoints.usePoints && data.loyaltyPoints.pointsToRedeem > 0) {
          pointsRedeemed = data.loyaltyPoints.pointsToRedeem;
          pointsDiscountAmount = data.loyaltyPoints.pointsDiscountAmount;
        }
      }

      // Create appointment record
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          customer_id: data.customerId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_price: data.totalPrice,
          status: status,
          location: data.locationId,
          discount_type: data.discountType,
          discount_value: data.discountValue,
          tax_id: data.appliedTaxId,
          tax_amount: data.taxAmount,
          payment_method: data.paymentMethod,
          membership_id: data.membershipId,
          membership_name: data.membershipName,
          membership_discount: data.membershipDiscount,
          coupon_id: data.couponId,
          coupon_name: data.couponName,
          coupon_amount: data.couponAmount,
          number_of_bookings: selectedItems.length,
          points_earned: pointsEarned,
          points_redeemed: pointsRedeemed,
          points_discount_amount: pointsDiscountAmount,
          notes: data.notes,
        })
        .select()
        .single();

      if (appointmentError) {
        throw appointmentError;
      }

      // Create booking records for each selected item
      for (const item of selectedItems) {
        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            appointment_id: appointmentData.id,
            service_id: item.type === 'service' ? item.id : null,
            package_id: item.type === 'package' ? item.id : null,
            employee_id: item.employee?.id,
            price_paid: item.price,
            original_price: item.price,
            status: status,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
          });

        if (bookingError) {
          throw bookingError;
        }
      }

      // Update customer points balance if loyalty is enabled and points are earned or redeemed
      if (data.loyaltyPoints && data.loyaltyPoints.isLoyaltyEnabled && data.customerId) {
        // Fetch current points balance
        const { data: currentPoints, error: pointsError } = await supabase
          .from('profiles')
          .select('wallet_balance, cashback_balance')
          .eq('id', data.customerId)
          .single();
        
        if (!pointsError && currentPoints) {
          const currentWalletBalance = Number(currentPoints.wallet_balance) || 0;
          
          // Calculate new wallet balance
          let newWalletBalance = currentWalletBalance;
          
          // Subtract redeemed points if any
          if (pointsRedeemed) {
            newWalletBalance -= pointsRedeemed;
          }
          
          await supabase
            .from('profiles')
            .update({
              wallet_balance: newWalletBalance,
            })
            .eq('id', data.customerId);
            
          // Fetch loyalty settings to get points validity days
          const { data: loyaltySettings } = await supabase
            .from('loyalty_program_settings')
            .select('points_validity_days')
            .single();
            
          // If points are earned, record them in the points_transactions table
          if (pointsEarned && pointsEarned > 0 && loyaltySettings) {
            const today = new Date();
            const expiryDate = loyaltySettings.points_validity_days
              ? new Date(today.setDate(today.getDate() + loyaltySettings.points_validity_days))
              : null;
              
            // Record points earned in points transaction history
            await supabase.from('points_transactions').insert({
              customer_id: data.customerId,
              appointment_id: appointmentData.id,
              points: pointsEarned,
              transaction_type: 'earn',
              expiry_date: expiryDate ? expiryDate.toISOString() : null,
              status: 'pending', // Will be updated to active once payment is confirmed
            });
          }
          
          // If points are redeemed, record them in the points_transactions table
          if (pointsRedeemed && pointsRedeemed > 0) {
            await supabase.from('points_transactions').insert({
              customer_id: data.customerId,
              appointment_id: appointmentData.id,
              points: -pointsRedeemed, // Negative for redemption
              transaction_type: 'redeem',
              status: 'completed',
            });
          }
        }
      }

      setIsLoading(false);

      return {
        success: true,
        appointmentId: appointmentData.id,
        message: `Appointment ${existingAppointment ? 'updated' : 'created'} successfully!`,
      };

    } catch (error: any) {
      setIsLoading(false);
      toast.error(error.message || 'Failed to save appointment.');
      console.error('Error saving appointment:', error);
      return { success: false, message: error.message || 'Failed to save appointment.' };
    }
  };

  return {
    isLoading,
    setIsLoading,
    saveAppointment,
  };
}
