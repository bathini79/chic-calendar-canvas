
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startOfDay, format, parse, addMinutes } from "date-fns";
import { SCREEN, AppointmentStatus } from "../types";

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
  getTotalPrice: (services: any[], packages: any[], discountType: string, discountValue: number) => number;
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
  couponId = null,
  couponDiscount = 0
}: SaveAppointmentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveAppointment = async (params?: any): Promise<string | undefined> => {
    try {
      setIsLoading(true);
      
      // Extract appointment ID if it was passed as first parameter (backward compatibility)
      let appointmentId: string | undefined;
      let summaryParams: any = {};
      
      if (params) {
        if (typeof params === 'string') {
          // If params is a string, it's an appointmentId from the old function signature
          appointmentId = params;
        } else if (typeof params === 'object') {
          // If params is an object, it contains summary values AND might contain appointmentId
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

      // Parse the time string and combine it with the selected date
      const timeComponents = selectedTime.split(':');
      const hours = parseInt(timeComponents[0], 10);
      const minutes = parseInt(timeComponents[1], 10);
      
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      // Get all selected services and packages
      const selectedServiceObjects = selectedServices.map(id => 
        services.find(s => s.id === id)
      ).filter(Boolean);
      
      const selectedPackageObjects = selectedPackages.map(id => 
        packages.find(p => p.id === id)
      ).filter(Boolean);

      // Calculate total duration and end time
      const totalDuration = getTotalDuration(selectedServiceObjects, selectedPackageObjects);
      const endTime = addMinutes(startTime, totalDuration);

      // Use the values from summary params if available, otherwise calculate
      const calculatedTaxAmount = summaryParams.taxAmount !== undefined ? 
        summaryParams.taxAmount : 
        taxAmount;
      
      const calculatedCouponDiscount = summaryParams.couponDiscount !== undefined ? 
        summaryParams.couponDiscount : 
        couponDiscount;
        
      const membershipId = summaryParams.membershipId !== undefined ? 
        summaryParams.membershipId : 
        null;
      
      const membershipName = summaryParams.membershipName !== undefined ? 
        summaryParams.membershipName : 
        null;
      
      const membershipDiscount = summaryParams.membershipDiscount !== undefined ? 
        summaryParams.membershipDiscount : 
        0;
        
      // Use provided summary total price or calculate it
      const totalPrice = summaryParams.total !== undefined ? 
        summaryParams.total : 
        getTotalPrice(selectedServiceObjects, selectedPackageObjects, discountType, discountValue) - calculatedCouponDiscount - membershipDiscount + calculatedTaxAmount;
      
      // Use provided tax and coupon IDs or fall back to props
      const usedTaxId = summaryParams.appliedTaxId !== undefined ? 
        (typeof summaryParams.appliedTaxId === 'object' && summaryParams.appliedTaxId !== null ? 
          summaryParams.appliedTaxId.id || summaryParams.appliedTaxId : summaryParams.appliedTaxId) : 
        appliedTaxId;
        
      const usedCouponId = summaryParams.couponId !== undefined ? 
        (typeof summaryParams.couponId === 'object' && summaryParams.couponId !== null ? 
          summaryParams.couponId.id || summaryParams.couponId : summaryParams.couponId) : 
        couponId;

      console.log("Appointment data for saving:", {
        total: totalPrice,
        taxAmount: calculatedTaxAmount,
        taxId: usedTaxId,
        couponDiscount: calculatedCouponDiscount,
        couponId: usedCouponId,
        membershipId,
        membershipName,
        membershipDiscount
      });

      // Create or update appointment with properly typed status
      const appointmentStatus: AppointmentStatus = 
        currentScreen === SCREEN.CHECKOUT ? 'completed' : 'pending';

      const appointmentData = {
        customer_id: selectedCustomer.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: appointmentStatus,
        total_price: totalPrice,
        discount_type: discountType as 'none' | 'percentage' | 'fixed',
        discount_value: discountValue,
        payment_method: paymentMethod,
        notes: notes,
        location: locationId,
        tax_amount: calculatedTaxAmount,
        tax_id: usedTaxId,
        coupon_id: usedCouponId,
        membership_id: membershipId,
        membership_name: membershipName,
        membership_discount: membershipDiscount
      };

      let createdAppointmentId;

      if (appointmentId) {
        // Update existing appointment
        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointmentId);

        if (error) throw error;
        createdAppointmentId = appointmentId;

        // Delete existing bookings
        const { error: deleteError } = await supabase
          .from('bookings')
          .delete()
          .eq('appointment_id', appointmentId);

        if (deleteError) throw deleteError;
      } else {
        // Create new appointment
        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (error) throw error;
        createdAppointmentId = data.id;
      }

      // Calculate adjusted prices for services based on discounts
      const adjustedItems = calculateAdjustedPrices(
        selectedServices,
        selectedPackages,
        services,
        packages,
        discountType,
        discountValue,
        calculatedCouponDiscount,
        membershipDiscount,
        customizedServices
      );

      // Create bookings for each service with properly typed status
      for (const item of adjustedItems) {
        const bookingStatus: AppointmentStatus = 
          currentScreen === SCREEN.CHECKOUT ? 'completed' : 'pending';

        const bookingData: any = {
          appointment_id: createdAppointmentId,
          status: bookingStatus,
          price_paid: item.adjustedPrice,
          original_price: item.originalPrice,
          employee_id: item.stylistId === 'any' ? null : item.stylistId,
        };

        if (item.type === 'service') {
          bookingData.service_id = item.id;
          
          const service = services.find(s => s.id === item.id);
          if (service) {
            const serviceStartTime = new Date(startTime);
            bookingData.start_time = serviceStartTime.toISOString();
            bookingData.end_time = addMinutes(serviceStartTime, service.duration).toISOString();
          }
        } else if (item.type === 'package') {
          bookingData.package_id = item.id;

          const pkg = packages.find(p => p.id === item.id);
          if (pkg) {
            // For packages, we'll use the same start/end time as the appointment
            bookingData.start_time = startTime.toISOString();
            bookingData.end_time = endTime.toISOString();
          }
        }

        const { error } = await supabase.from('bookings').insert(bookingData);
        if (error) throw error;
      }

      // If package has customized services, add them as separate bookings
      for (const packageId of selectedPackages) {
        const pkg = packages.find(p => p.id === packageId);
        if (!pkg || !pkg.is_customizable) continue;
        
        // For each service in the package
        if (pkg.package_services) {
          for (const packageService of pkg.package_services) {
            const service = packageService.service;
            if (!service) continue;
            
            const stylistId = selectedStylists[service.id] || selectedStylists[packageId] || null;
            
            const bookingData = {
              appointment_id: createdAppointmentId,
              service_id: service.id,
              package_id: packageId,
              employee_id: stylistId === 'any' ? null : stylistId,
              status: currentScreen === SCREEN.CHECKOUT ? 'completed' : 'pending',
              start_time: startTime.toISOString(),
              end_time: addMinutes(startTime, service.duration).toISOString(),
              price_paid: 0, // Base package services typically don't have individual prices
              original_price: service.selling_price,
            };

            const { error } = await supabase.from('bookings').insert(bookingData);
            if (error) throw error;
          }
        }
        
        // Add customized services
        const customServiceIds = customizedServices[packageId] || [];
        for (const customServiceId of customServiceIds) {
          const customService = services.find(s => s.id === customServiceId);
          if (!customService) continue;
          
          // Find this customized service in the adjusted items to get the price
          const customItemPrice = adjustedItems.find(
            item => item.type === 'customService' && 
            item.id === customServiceId && 
            item.packageId === packageId
          )?.adjustedPrice || customService.selling_price;
          
          const stylistId = selectedStylists[customServiceId] || selectedStylists[packageId] || null;

          const bookingData = {
            appointment_id: createdAppointmentId,
            service_id: customServiceId,
            package_id: packageId,
            employee_id: stylistId === 'any' ? null : stylistId,
            status: currentScreen === SCREEN.CHECKOUT ? 'completed' : 'pending',
            start_time: startTime.toISOString(),
            end_time: addMinutes(startTime, customService.duration).toISOString(),
            price_paid: customItemPrice,
            original_price: customService.selling_price,
          };

          const { error } = await supabase.from('bookings').insert(bookingData);
          if (error) throw error;
        }
      }

      // Update the appointment with the number of bookings
      const { count, error: countError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('appointment_id', createdAppointmentId);

      if (countError) throw countError;

      const { error: updateError } = await supabase
        .from('appointments')
        .update({ number_of_bookings: count })
        .eq('id', createdAppointmentId);

      if (updateError) throw updateError;

      toast.success(appointmentId ? "Appointment updated" : "Appointment created");
      return createdAppointmentId;
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      toast.error(error.message || 'Failed to save appointment');
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAdjustedPrices = (
    selectedServices: string[],
    selectedPackages: string[],
    services: any[],
    packages: any[],
    discountType: string,
    discountValue: number,
    couponDiscount: number,
    membershipDiscount: number,
    customizedServices: Record<string, string[]>
  ) => {
    const items = [];
    const totalBeforeDiscount = getTotalPrice(
      selectedServices, 
      selectedPackages, 
      services, 
      packages, 
      customizedServices
    );
    
    if (totalBeforeDiscount <= 0) {
      return [];
    }
    
    let globalDiscountAmount = 0;
    if (discountType === 'percentage') {
      globalDiscountAmount = totalBeforeDiscount * (discountValue / 100);
    } else if (discountType === 'fixed') {
      globalDiscountAmount = discountValue;
    }

    // Determine how to distribute discounts
    const totalItems = selectedServices.length + selectedPackages.length;
    const globalDiscountPerItem = totalItems > 0 ? globalDiscountAmount / totalItems : 0;
    const couponDiscountPerItem = totalItems > 0 ? couponDiscount / totalItems : 0;
    
    // Process individual services
    for (const serviceId of selectedServices) {
      const service = services.find(s => s.id === serviceId);
      if (!service) continue;
      
      let originalPrice = service.selling_price;
      let adjustedPrice = originalPrice;
      
      // Apply global discount (proportionally)
      adjustedPrice -= globalDiscountPerItem;
      
      // Apply coupon discount (proportionally)
      adjustedPrice -= couponDiscountPerItem;
      
      // Apply membership discount (if applicable)
      // For simplicity, we're dividing membership discount equally among services
      const specificMembershipDiscount = selectedServices.length > 0 ? 
        membershipDiscount / selectedServices.length : 0;
      adjustedPrice -= specificMembershipDiscount;
      
      // Ensure price doesn't go below zero
      adjustedPrice = Math.max(0, adjustedPrice);
      
      items.push({
        id: serviceId,
        type: 'service',
        stylistId: selectedStylists[serviceId],
        originalPrice,
        adjustedPrice: parseFloat(adjustedPrice.toFixed(2))
      });
    }
    
    // Process packages
    for (const packageId of selectedPackages) {
      const pkg = packages.find(p => p.id === packageId);
      if (!pkg) continue;
      
      const packageBasePrice = pkg.price;
      let adjustedPrice = packageBasePrice;
      
      // Apply global discount (proportionally)
      adjustedPrice -= globalDiscountPerItem;
      
      // Apply coupon discount (proportionally) 
      adjustedPrice -= couponDiscountPerItem;
      
      // Apply membership discount (if applicable)
      const specificMembershipDiscount = selectedPackages.length > 0 ? 
        membershipDiscount / selectedPackages.length : 0;
      adjustedPrice -= specificMembershipDiscount;
      
      // Ensure price doesn't go below zero
      adjustedPrice = Math.max(0, adjustedPrice);
      
      items.push({
        id: packageId,
        type: 'package',
        stylistId: selectedStylists[packageId],
        originalPrice: packageBasePrice,
        adjustedPrice: parseFloat(adjustedPrice.toFixed(2))
      });
      
      // Handle customized services for the package
      if (pkg.is_customizable && customizedServices[packageId]) {
        for (const customServiceId of customizedServices[packageId]) {
          const service = services.find(s => s.id === customServiceId);
          
          // Check if this service is already included in the package
          const isBaseService = pkg.package_services?.some(ps => 
            ps.service.id === customServiceId
          );
          
          // Only add customized services that aren't part of the base package
          if (service && !isBaseService) {
            let originalPrice = service.selling_price;
            let adjustedPrice = originalPrice;
            
            // Apply discounts proportionally to customized services as well
            adjustedPrice = Math.max(0, adjustedPrice);
            
            items.push({
              id: customServiceId,
              packageId: packageId,
              type: 'customService',
              stylistId: selectedStylists[customServiceId] || selectedStylists[packageId],
              originalPrice,
              adjustedPrice: parseFloat(adjustedPrice.toFixed(2))
            });
          }
        }
      }
    }
    
    return items;
  };

  return { handleSaveAppointment, isLoading };
}
