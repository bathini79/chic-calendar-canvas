
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppointmentStatus } from '../types';

interface SaveAppointmentParams {
  appointmentId?: string;
  customerId: string;
  date: Date;
  time: string;
  services: string[];
  packages: string[];
  stylists: Record<string, string>;
  totalPrice: number;
  duration: number;
  discountType: 'none' | 'fixed' | 'percentage';
  discountValue: number;
  paymentMethod: string;
  notes: string;
  status: AppointmentStatus;
  locationId: string;
}

export default function useSaveAppointment() {
  const [isLoading, setIsLoading] = useState(false);

  const saveAppointment = async (params: SaveAppointmentParams) => {
    try {
      setIsLoading(true);
      
      const {
        appointmentId,
        customerId,
        date,
        time,
        services,
        packages,
        stylists,
        totalPrice,
        duration,
        discountType,
        discountValue,
        paymentMethod,
        notes,
        status,
        locationId
      } = params;
      
      if (!customerId) {
        throw new Error('Customer is required');
      }
      
      if (services.length === 0 && packages.length === 0) {
        throw new Error('At least one service or package is required');
      }
      
      // Get the date parts
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // Get the time parts
      const [hours, minutes] = time.split(':').map(Number);
      
      // Create start time
      const startTime = new Date(year, month, day, hours, minutes);
      
      // Create end time by adding duration
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      // Format appointment data
      const appointmentData = {
        customer_id: customerId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: status as AppointmentStatus,
        total_price: totalPrice,
        discount_type: discountType,
        discount_value: discountValue,
        payment_method: paymentMethod,
        notes,
        location: locationId,
        total_duration: duration,
        number_of_bookings: services.length + packages.length
      };
      
      let appointment;
      
      // Create or update appointment
      if (appointmentId) {
        // Update existing appointment
        const { data, error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointmentId)
          .select()
          .single();
        
        if (error) throw error;
        appointment = data;
        
        // Delete existing bookings for this appointment
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
        appointment = data;
      }
      
      // Create bookings for services
      for (const serviceId of services) {
        const { error } = await supabase
          .from('bookings')
          .insert({
            appointment_id: appointment.id,
            service_id: serviceId,
            employee_id: stylists[serviceId] || null,
            price_paid: 0, // This will be calculated later
            status: status as AppointmentStatus,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
          });
        
        if (error) throw error;
      }
      
      // Create bookings for packages
      for (const packageId of packages) {
        const { error } = await supabase
          .from('bookings')
          .insert({
            appointment_id: appointment.id,
            package_id: packageId,
            employee_id: stylists[packageId] || null,
            price_paid: 0, // This will be calculated later
            status: status as AppointmentStatus,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
          });
        
        if (error) throw error;
      }
      
      toast.success('Appointment saved successfully');
      
      return {
        success: true,
        appointmentId: appointment.id
      };
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      toast.error(error.message || 'Failed to save appointment');
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveAppointment,
    isLoading
  };
}
