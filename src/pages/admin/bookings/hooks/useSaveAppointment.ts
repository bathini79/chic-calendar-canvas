import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import type { AppointmentStatus } from "../types";

export function useSaveAppointment() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const saveAppointment = async (params?: any) => {
    try {
      setIsLoading(true);

      const selectedServices = (localStorage.getItem('selectedServices') || '').split(',').filter(Boolean);
      const selectedPackages = (localStorage.getItem('selectedPackages') || '').split(',').filter(Boolean);
      const selectedCustomer = JSON.parse(localStorage.getItem('selectedCustomer') || '{}');
      const selectedStylists = JSON.parse(localStorage.getItem('selectedStylists') || '{}');
      const selectedTimeSlots = JSON.parse(localStorage.getItem('selectedTimeSlots') || '{}');
      const selectedDate = localStorage.getItem('selectedDate') || '';
      const discountType = localStorage.getItem('discountType') as "none" | "fixed" | "percentage" || 'none';
      const discountValue = Number(localStorage.getItem('discountValue') || '0');
      const paymentMethod = localStorage.getItem('paymentMethod') || 'cash';
      const notes = localStorage.getItem('notes') || '';
      const existingAppointmentId = localStorage.getItem('appointmentId') || null;
      const selectedLocation = localStorage.getItem('selectedLocation') || null;
      const appointmentStatus = localStorage.getItem('appointmentStatus') as AppointmentStatus || 'pending';
      const subtotal = Number(localStorage.getItem('subtotal')) || 0;
      const finalTotal = Number(localStorage.getItem('finalTotal')) || 0;
      const taxAmount = Number(localStorage.getItem('taxAmount')) || 0;
      const receiptNumber = localStorage.getItem('receiptNumber') || '';
      const customizedServices = JSON.parse(localStorage.getItem('customizedServices') || '{}');

      if (!selectedCustomer?.id) {
        throw new Error("Customer is required");
      }

      if (!selectedDate) {
        throw new Error("Date is required");
      }

      const startDateTime = new Date(`${selectedDate}T${selectedTimeSlots[selectedServices[0] || selectedPackages[0]]}:00`);
      let endDateTime = new Date(startDateTime);

      // Fetch service and package details
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .in('id', selectedServices);

      if (servicesError) throw servicesError;

      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .in('id', selectedPackages);

      if (packagesError) throw packagesError;

      // Calculate total duration
      let totalDuration = 0;
      selectedServices.forEach(serviceId => {
        const service = services?.find(s => s.id === serviceId);
        totalDuration += service?.duration || 0;
      });

      selectedPackages.forEach(packageId => {
        const pkg = packages?.find(p => p.id === packageId);
        totalDuration += pkg?.duration || 0;
      });

      endDateTime.setMinutes(startDateTime.getMinutes() + totalDuration);

      // Update/Insert appointment record
      let appointmentData = {
        customer_id: selectedCustomer?.id,
        start_time: startDateTime,
        end_time: endDateTime,
        status: appointmentStatus,
        total_price: params?.total || finalTotal,
        discount_type: discountType,
        discount_value: discountValue,
        payment_method: paymentMethod,
        notes,
        location: selectedLocation,
        tax_amount: params?.taxAmount || 0,
        coupon_id: params?.couponId || null
      };
      
      // Add membership fields if present
      if (params?.membershipId) {
        appointmentData = {
          ...appointmentData,
          membership_id: params.membershipId,
          membership_name: params.membershipName,
          membership_discount: params.membershipDiscount
        };
      }

      let appointmentId = existingAppointmentId;
      
      if (!existingAppointmentId) {
        // Insert new appointment
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .insert([{
            ...appointmentData,
            transaction_type: 'sale'
          }])
          .select('id')
          .single();

        if (appointmentError) throw appointmentError;
        appointmentId = appointmentData.id;
      } else {
        // Update existing appointment
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({
            ...appointmentData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAppointmentId);

        if (appointmentError) throw appointmentError;
      }

      // Insert/Update bookings
      const allItems = [...selectedServices, ...selectedPackages];

      // First, delete existing bookings for existing appointments
      if (existingAppointmentId) {
        const { error: deleteError } = await supabase
          .from('bookings')
          .delete()
          .eq('appointment_id', existingAppointmentId);

        if (deleteError) throw deleteError;
      }

      // Then, insert new bookings
      for (const itemId of allItems) {
        const isService = selectedServices.includes(itemId);

        let bookingData = {
          appointment_id: appointmentId,
          start_time: new Date(`${selectedDate}T${selectedTimeSlots[itemId]}:00`).toISOString(),
          employee_id: selectedStylists[itemId],
          price_paid: 0,
          status: appointmentStatus,
        };

        if (isService) {
          const service = services?.find(s => s.id === itemId);
          bookingData = {
            ...bookingData,
            service_id: itemId,
            price_paid: service?.selling_price || 0,
          };
        } else {
          const pkg = packages?.find(p => p.id === itemId);
          bookingData = {
            ...bookingData,
            package_id: itemId,
            price_paid: pkg?.price || 0,
          };
        }

        const { error: bookingError } = await supabase
          .from('bookings')
          .insert([bookingData]);

        if (bookingError) throw bookingError;
      }

      // Clear local storage
      localStorage.removeItem('selectedServices');
      localStorage.removeItem('selectedPackages');
      localStorage.removeItem('selectedCustomer');
      localStorage.removeItem('selectedStylists');
      localStorage.removeItem('selectedTimeSlots');
      localStorage.removeItem('selectedDate');
      localStorage.removeItem('discountType');
      localStorage.removeItem('discountValue');
      localStorage.removeItem('paymentMethod');
      localStorage.removeItem('notes');
      localStorage.removeItem('appointmentId');
      localStorage.removeItem('selectedLocation');
      localStorage.removeItem('appointmentStatus');
      localStorage.removeItem('subtotal');
      localStorage.removeItem('finalTotal');
      localStorage.removeItem('taxAmount');
      localStorage.removeItem('receiptNumber');
      localStorage.removeItem('customizedServices');

      return appointmentId;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    saveAppointment,
  };
}
