import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addMinutes } from "date-fns";
import { SCREEN, AppointmentStatus } from "../types";
import { useAppointmentNotifications } from "@/hooks/use-appointment-notifications";

interface SaveAppointmentProps {
  selectedDate: Date | null;
  selectedTime: string;
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: any[];
  packages: any[];
  selectedStylists: Record<string, string>;
  getTotalDuration: (services: any[], packages: any[]) => number;
  getTotalPrice: (
    services: any[],
    packages: any[],
    discountType: string,
    discountValue: number
  ) => number;
  discountType: string;
  discountValue: number;
  paymentMethod: string;
  notes: string;
  customizedServices: Record<string, string[]>;
  currentScreen: SCREEN;
  locationId?: string;
  appliedTaxId?: string | null;
  taxAmount?: number;
  couponId?: string | null;
  couponDiscount?: number;
  status?: AppointmentStatus;
  membership_discount?: number;
  membership_id?: string | null;
  membership_name?: string | null;
  coupon_name?: string | null;
  coupon_amount?: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsDiscountAmount?: number;
}

export default function useSaveAppointment({
  selectedDate,
  selectedTime,
  selectedCustomer,
  selectedServices,
  selectedPackages,
  services,
  packages,
  selectedStylists,
  getTotalDuration,
  getTotalPrice,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  customizedServices,
  currentScreen,
  locationId,
  appliedTaxId,
  taxAmount = 0,
  couponDiscount = 0,
  status,
  membership_discount,
  membership_id,
  membership_name,
  coupon_name,
  coupon_amount,
  pointsEarned = 0,
  pointsRedeemed = 0,
  pointsDiscountAmount = 0,
}: SaveAppointmentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { sendNotification } = useAppointmentNotifications();

  const handleSaveAppointment = async (
    params?: any
  ): Promise<string | undefined> => {
    try {
      setIsLoading(true);

      let appointmentId: string | undefined;
      let summaryParams: any = {};

      if (params) {
        if (typeof params === "string") {
          appointmentId = params;
        } else if (typeof params === "object") {
          summaryParams = params;

          if (params.appointmentId) {
            appointmentId = params.appointmentId;
          }
        }
      }

      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }

      if (selectedServices.length === 0 && selectedPackages.length === 0) {
        toast.error("Please select at least one service or package");
        return;
      }

      if (!selectedDate) {
        toast.error("Please select a date");
        return;
      }

      const timeComponents = selectedTime.split(":");
      const hours = parseInt(timeComponents[0], 10);
      const minutes = parseInt(timeComponents[1], 10);

      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const selectedServiceObjects = selectedServices
        .map((id) => services.find((s) => s.id === id))
        .filter(Boolean);

      const selectedPackageObjects = selectedPackages
        .map((id) => packages.find((p) => p.id === id))
        .filter(Boolean);

      const totalDuration = getTotalDuration(
        selectedServiceObjects,
        selectedPackageObjects
      );
      const endTime = addMinutes(startTime, totalDuration);

      const calculatedTaxAmount =
        summaryParams.taxAmount !== undefined
          ? summaryParams.taxAmount
          : taxAmount;

      const calculatedCouponDiscount =
        summaryParams.couponDiscount !== undefined
          ? summaryParams.couponDiscount
          : couponDiscount;

      const totalPrice =
        summaryParams.total !== undefined
          ? summaryParams.total
          : getTotalPrice(
              selectedServiceObjects,
              selectedPackageObjects,
              discountType,
              discountValue
            ) -
            calculatedCouponDiscount +
            calculatedTaxAmount;

      const roundedTotal = Math.round(totalPrice);
      const roundOffDifference = roundedTotal - totalPrice;

      const usedTaxId =
        summaryParams.appliedTaxId !== undefined
          ? typeof summaryParams.appliedTaxId === "object" &&
            summaryParams.appliedTaxId !== null
            ? summaryParams.appliedTaxId.id || summaryParams.appliedTaxId
            : summaryParams.appliedTaxId
          : appliedTaxId;

      const appointmentStatus: AppointmentStatus =
         (currentScreen === SCREEN.CHECKOUT ? "completed" : "booked");

      let existingAppointmentLocation;
      if (appointmentId) {
        const { data: existingAppointment, error } = await supabase
          .from("appointments")
          .select("location")
          .eq("id", appointmentId)
          .single();

        if (!error && existingAppointment) {
          existingAppointmentLocation = existingAppointment.location;
        }
      }

      const pointsEarnedFromParams = 
        summaryParams?.pointsEarned !== undefined
          ? summaryParams.pointsEarned
          : pointsEarned;
          
      const pointsRedeemedFromParams = 
        summaryParams?.pointsRedeemed !== undefined
          ? summaryParams.pointsRedeemed
          : pointsRedeemed;
          
      const pointsDiscountAmountFromParams = 
        summaryParams?.pointsDiscountAmount !== undefined
          ? summaryParams.pointsDiscountAmount
          : pointsDiscountAmount;
      
      const appointmentData: any = {
        customer_id: selectedCustomer.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: locationId || existingAppointmentLocation || null,
        notes: notes,
        status: appointmentStatus,
        total_price: summaryParams.total !== undefined ? summaryParams.total : totalPrice, // Use the passed total price
        round_off_difference: summaryParams.roundOffDifference !== undefined ? summaryParams.roundOffDifference : 0, // Use the passed round-off difference
        discount_type: discountType as "none" | "percentage" | "fixed",
        discount_value: discountValue,
        payment_method: paymentMethod,
        tax_amount: calculatedTaxAmount,
        tax_id: usedTaxId,
        coupon_id: summaryParams?.couponId,
        coupon_name: summaryParams?.couponName || coupon_name,
        coupon_amount: summaryParams?.couponAmount || coupon_amount,
        membership_discount:
          summaryParams?.membershipDiscount || membership_discount,
        membership_id: summaryParams?.membershipId || membership_id,
        membership_name: summaryParams?.membershipName || membership_name,
        points_earned: pointsEarnedFromParams,
        points_redeemed: pointsRedeemedFromParams,
        points_discount_amount: pointsDiscountAmountFromParams,
      };

      let createdAppointmentId;
      let isNewAppointment = false;

      if (appointmentId) {
        const { error } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", appointmentId);

        if (error) throw error;
        createdAppointmentId = appointmentId;

        const { error: deleteError } = await supabase
          .from("bookings")
          .delete()
          .eq("appointment_id", appointmentId);

        if (deleteError) throw deleteError;
      } else {
        const { data, error } = await supabase
          .from("appointments")
          .insert(appointmentData)
          .select()
          .single();

        if (error) throw error;
        createdAppointmentId = data.id;
        isNewAppointment = true;
      }

      for (const serviceId of selectedServices) {
        const service = services.find((s) => s.id === serviceId);
        if (!service) continue;

        const serviceStartTime = new Date(startTime);
        const bookingStatus: AppointmentStatus =
          currentScreen === SCREEN.CHECKOUT ? "completed" : "booked";

        // For service price, only use adjustedPrices which contain membership, coupon 
        // and regular discounts, but not loyalty points discount
        // Loyalty points discount is applied to the total only, not individual services
        const pricePaid =
          summaryParams.adjustedPrices &&
          summaryParams.adjustedPrices[serviceId] !== undefined
            ? summaryParams.adjustedPrices[serviceId]
            : service.selling_price;

        const bookingData = {
          appointment_id: createdAppointmentId,
          service_id: serviceId,
          employee_id:
            selectedStylists[serviceId] === "any"
              ? null
              : selectedStylists[serviceId],
          status: bookingStatus,
          start_time: serviceStartTime.toISOString(),
          end_time: addMinutes(
            serviceStartTime,
            service.duration
          ).toISOString(),
          price_paid: pricePaid,
          original_price: service.original_price || service.selling_price,
        };

        const { error } = await supabase.from("bookings").insert(bookingData);

        if (error) throw error;
      }

      for (const packageId of selectedPackages) {
        const pkg = packages.find((p) => p.id === packageId);
        if (!pkg) continue;

        const packageServiceIds =
          pkg.package_services?.map((ps: any) => ps.service.id) || [];

        for (const packageServiceId of packageServiceIds) {
          const packageService = services.find(
            (s) => s.id === packageServiceId
          );
          if (!packageService) continue;

          const packageServiceStartTime = new Date(startTime);

          // For package service price, only use adjustedPrices which contain membership, coupon 
          // and regular discounts, but not loyalty points discount
          // Loyalty points discount is applied to the total only, not individual services
          const pricePaid =
            summaryParams.adjustedPrices &&
            summaryParams.adjustedPrices[packageServiceId] !== undefined
              ? summaryParams.adjustedPrices[packageServiceId]
              : packageService.selling_price;

          const bookingData = {
            appointment_id: createdAppointmentId,
            service_id: packageServiceId,
            package_id: packageId,
            employee_id:
              selectedStylists[packageServiceId] === "any"
                ? null
                : selectedStylists[packageServiceId],
            status: currentScreen === SCREEN.CHECKOUT ? "completed" : "booked",
            start_time: packageServiceStartTime.toISOString(),
            end_time: addMinutes(
              packageServiceStartTime,
              packageService.duration
            ).toISOString(),
            price_paid: pricePaid,
            original_price: packageService.selling_price,
          };

          const { error } = await supabase.from("bookings").insert(bookingData);

          if (error) throw error;
        }

        const customServiceIds = customizedServices[packageId] || [];
        for (const customServiceId of customServiceIds) {
          const customService = services.find((s) => s.id === customServiceId);
          if (!customService) continue;

          const customServiceStartTime = new Date(startTime);

          const isInPackage = packageServiceIds.includes(customServiceId);
          if (isInPackage) continue;

          // For custom service price, only use adjustedPrices which contain membership, coupon 
          // and regular discounts, but not loyalty points discount
          // Loyalty points discount is applied to the total only, not individual services
          const pricePaid =
            summaryParams.adjustedPrices &&
            summaryParams.adjustedPrices[customServiceId] !== undefined
              ? summaryParams.adjustedPrices[customServiceId]
              : customService.selling_price;

          const bookingData = {
            appointment_id: createdAppointmentId,
            service_id: customServiceId,
            package_id: packageId,
            employee_id:
              selectedStylists[customServiceId] === "any"
                ? null
                : selectedStylists[customServiceId],
            status: currentScreen === SCREEN.CHECKOUT ? "completed" : "booked",
            start_time: customServiceStartTime.toISOString(),
            end_time: addMinutes(
              customServiceStartTime,
              customService.duration
            ).toISOString(),
            price_paid: pricePaid,
            original_price: customService.selling_price,
          };

          const { error } = await supabase.from("bookings").insert(bookingData);

          if (error) throw error;
        }
      }

      const { count, error: countError } = await supabase
        .from("bookings")
        .select("id", { count: "exact" })
        .eq("appointment_id", createdAppointmentId);

      if (countError) throw countError;

      const { error: updateError } = await supabase
        .from("appointments")
        .update({ number_of_bookings: count })
        .eq("id", createdAppointmentId);

      if (updateError) throw updateError;
      
      if (appointmentStatus === "completed" && createdAppointmentId) {
        try {
          const { data: customerData, error: customerFetchError } = await supabase
            .from("profiles")
            .select("wallet_balance")
            .eq("id", selectedCustomer.id)
            .single();
            
          if (customerFetchError) {
            console.error("Error fetching customer points:", customerFetchError);
            toast.error("Failed to fetch customer loyalty points");
            return createdAppointmentId;
          }

          console.log("Loyalty Points Transaction:", {
            customerId: selectedCustomer.id,
            pointsRedeemed: pointsRedeemedFromParams,
            pointsEarned: pointsEarnedFromParams
          });
          
          const currentWalletBalance = typeof customerData.wallet_balance === 'number' ? customerData.wallet_balance : 0;
          const wallet = currentWalletBalance + pointsEarnedFromParams - pointsRedeemedFromParams
          const newWalletBalance = wallet > 0 ? wallet : 0;
          
          console.log(`Wallet Balance Update: ${currentWalletBalance} -> ${newWalletBalance}`);
          
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              wallet_balance: newWalletBalance,
              last_used: new Date().toISOString()
            })
            .eq("id", selectedCustomer.id);
          
          if (updateError) {
            console.error("Error updating customer loyalty points:", updateError);
            toast.error("Failed to update loyalty points");
          } else {
            console.log(`Loyalty Points Updated: Wallet Balance: ${currentWalletBalance} -> ${newWalletBalance}`);
          }
          
          await sendNotification(createdAppointmentId, "completed");
        } catch (notificationError) {
          console.error(
            "Failed to send completion notification:",
            notificationError
          );
        }
      }

      toast.success(
        appointmentId ? "Appointment updated" : "Appointment created"
      );
      return createdAppointmentId;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return { handleSaveAppointment, isLoading };
}
