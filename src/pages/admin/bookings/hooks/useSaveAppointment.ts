
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
        
      // Use provided summary total price or calculate it
      const totalPrice = summaryParams.total !== undefined ? 
        summaryParams.total : 
        getTotalPrice(selectedServiceObjects, selectedPackageObjects, discountType, discountValue) - calculatedCouponDiscount + calculatedTaxAmount;
      
      // Use provided tax and coupon IDs or fall back to props
      const usedTaxId = summaryParams.appliedTaxId !== undefined ? 
        summaryParams.appliedTaxId : 
        appliedTaxId;
        
      const usedCouponId = summaryParams.couponId !== undefined ? 
        summaryParams.couponId : 
        couponId;

      console.log("Appointment data for saving:", {
        total: totalPrice,
        taxAmount: calculatedTaxAmount,
        couponDiscount: calculatedCouponDiscount,
        taxId: usedTaxId,
        couponId: usedCouponId
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
        tax_id: usedTaxId,
        tax_amount: calculatedTaxAmount,
        coupon_id: usedCouponId
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

      // Create bookings for each service with properly typed status
      for (const serviceId of selectedServices) {
        const service = services.find(s => s.id === serviceId);
        if (!service) continue;

        const serviceStartTime = new Date(startTime);
        const bookingStatus: AppointmentStatus = 
          currentScreen === SCREEN.CHECKOUT ? 'completed' : 'pending';

        const bookingData = {
          appointment_id: createdAppointmentId,
          service_id: serviceId,
          employee_id: selectedStylists[serviceId] === 'any' ? null : selectedStylists[serviceId],
          status: bookingStatus,
          start_time: serviceStartTime.toISOString(),
          end_time: addMinutes(serviceStartTime, service.duration).toISOString(),
          price_paid: service.selling_price,
          original_price: service.original_price || service.selling_price,
        };

        const { error } = await supabase
          .from('bookings')
          .insert(bookingData);

        if (error) throw error;
      }

      // Create bookings for each package
      for (const packageId of selectedPackages) {
        const pkg = packages.find(p => p.id === packageId);
        if (!pkg) continue;

        // For each service in the package
        const packageServiceIds = pkg.package_services?.map((ps: any) => ps.service.id) || [];
        
        for (const packageServiceId of packageServiceIds) {
          const packageService = services.find(s => s.id === packageServiceId);
          if (!packageService) continue;

          const packageServiceStartTime = new Date(startTime);
          // TODO: Calculate proper start time based on previous services

          const bookingData = {
            appointment_id: createdAppointmentId,
            service_id: packageServiceId,
            package_id: packageId,
            employee_id: selectedStylists[packageServiceId] === 'any' ? null : selectedStylists[packageServiceId],
            status: currentScreen === SCREEN.CHECKOUT ? 'completed' : 'pending',
            start_time: packageServiceStartTime.toISOString(),
            end_time: addMinutes(packageServiceStartTime, packageService.duration).toISOString(),
            price_paid: 0, // Package services typically don't have individual prices
            original_price: packageService.selling_price,
          };

          const { error } = await supabase
            .from('bookings')
            .insert(bookingData);

          if (error) throw error;
        }

        // Add any customized services for this package
        const customServiceIds = customizedServices[packageId] || [];
        for (const customServiceId of customServiceIds) {
          const customService = services.find(s => s.id === customServiceId);
          if (!customService) continue;

          const customServiceStartTime = new Date(startTime);
          // TODO: Calculate proper start time based on previous services

          const bookingData = {
            appointment_id: createdAppointmentId,
            service_id: customServiceId,
            package_id: packageId,
            employee_id: selectedStylists[customServiceId] === 'any' ? null : selectedStylists[customServiceId],
            status: currentScreen === SCREEN.CHECKOUT ? 'completed' : 'pending',
            start_time: customServiceStartTime.toISOString(),
            end_time: addMinutes(customServiceStartTime, customService.duration).toISOString(),
            price_paid: customService.selling_price,
            original_price: customService.selling_price,
          };

          const { error } = await supabase
            .from('bookings')
            .insert(bookingData);

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

  return { handleSaveAppointment, isLoading };
}
