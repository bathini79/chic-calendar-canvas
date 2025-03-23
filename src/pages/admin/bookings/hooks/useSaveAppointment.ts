import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Customer, Service, Package } from "../types";

interface ServiceItem extends Service {
  stylistId: string;
  timeSlot: string;
  selling_price: number;
}

interface PackageItem extends Package {
  stylistId: string;
  timeSlot: string;
  price: number;
}

export function useSaveAppointment() {
  const [isLoading, setIsLoading] = useState(false);

  const saveAppointment = async (
    customer: Customer,
    serviceItems: ServiceItem[],
    packageItems: PackageItem[],
    notes: string,
    discountType: 'none' | 'percentage' | 'fixed',
    discountValue: number,
    paymentMethod: string,
    duration: number,
    params: any = {}
  ) => {
    if (!customer || !customer.id) {
      console.error("No customer selected");
      return null;
    }

    setIsLoading(true);
    
    try {
      const appointmentId = params.appointmentId || null;
      const isNew = !appointmentId;
      const now = new Date().toISOString();
      
      // Determine total price from services and packages
      const servicesTotal = serviceItems.reduce((sum, item) => sum + item.selling_price, 0);
      const packagesTotal = packageItems.reduce((sum, item) => sum + item.price, 0);
      let subtotal = servicesTotal + packagesTotal;
      
      // Apply discount
      let discounted_price = subtotal;
      if (discountType === 'percentage') {
        discounted_price = subtotal * (1 - (discountValue / 100));
      } else if (discountType === 'fixed') {
        discounted_price = Math.max(0, subtotal - discountValue);
      }
      
      // Apply tax
      const tax_amount = params.taxAmount || 0;
      
      // Apply coupon discount if available
      const coupon_id = params.couponId || null;
      const coupon_discount = params.couponDiscount || 0;
      
      // Apply membership discount if available
      const membership_id = params.membershipId || null;
      const membership_discount = params.membershipDiscount || 0;
      const membership_name = params.membershipName || null;
      
      // Calculate final price
      const total_price = params.total || (discounted_price - coupon_discount - membership_discount + tax_amount);
      
      // Check if we need to create a new appointment or update an existing one
      let appointment_id: string;
      
      if (isNew) {
        // Create new appointment
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            customer_id: customer.id,
            status: 'confirmed',
            total_price: total_price,
            discount_type: discountType,
            discount_value: discountValue,
            payment_method: paymentMethod,
            notes: notes,
            total_duration: duration,
            tax_amount: tax_amount,
            coupon_id: coupon_id,
            membership_id: membership_id,
            membership_discount: membership_discount,
            membership_name: membership_name
          })
          .select()
          .single();

        if (appointmentError) {
          throw appointmentError;
        }

        appointment_id = appointmentData.id;
      } else {
        // Update existing appointment
        const { error: appointmentUpdateError } = await supabase
          .from('appointments')
          .update({
            total_price: total_price,
            discount_type: discountType,
            discount_value: discountValue,
            payment_method: paymentMethod,
            notes: notes,
            total_duration: duration,
            updated_at: now,
            tax_amount: tax_amount,
            coupon_id: coupon_id,
            membership_id: membership_id,
            membership_discount: membership_discount,
            membership_name: membership_name
          })
          .eq('id', appointmentId);

        if (appointmentUpdateError) {
          throw appointmentUpdateError;
        }

        appointment_id = appointmentId;
      }

      // Handle service bookings
      for (const service of serviceItems) {
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            appointment_id: appointment_id,
            service_id: service.id,
            employee_id: service.stylistId,
            start_time: service.timeSlot,
            price_paid: service.selling_price,
          })
          .select()
          .single();

        if (bookingError) {
          throw bookingError;
        }
      }

      // Handle package bookings
      for (const pkg of packageItems) {
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            appointment_id: appointment_id,
            package_id: pkg.id,
            employee_id: pkg.stylistId,
            start_time: pkg.timeSlot,
            price_paid: pkg.price,
          })
          .select()
          .single();

        if (bookingError) {
          throw bookingError;
        }
      }

      return appointment_id;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, saveAppointment };
}
