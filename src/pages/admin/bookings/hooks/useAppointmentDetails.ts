
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Appointment, AppointmentStatus } from "../types";

export function useAppointmentDetails(appointmentId?: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  const fetchAppointment = useCallback(async () => {
    if (!appointmentId) {
      setAppointment(null);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          customer:profiles(*),
          bookings(
            *,
            service:services(*),
            package:packages(*),
            employee:employees(*)
          )
        `)
        .eq("id", appointmentId)
        .single();

      if (error) throw error;

      // Convert data to match Appointment type
      if (data) {
        // Handle status conversion to match AppointmentStatus type
        let mappedStatus: AppointmentStatus = data.status as AppointmentStatus;
        
        // Fetch location name if a location ID is provided
        let location_name = null;
        if (data.location) {
          const { data: locationData, error: locationError } = await supabase
            .from('locations')
            .select('name')
            .eq('id', data.location)
            .single();
            
          if (!locationError && locationData) {
            location_name = locationData.name;
          }
        }

        const appointmentData: Appointment = {
          ...data,
          location_id: data.location || null, // Map location to location_id for compatibility
          location: data.location,
          location_name: location_name,
          discount_type: (data.discount_type as "none" | "percentage" | "fixed") || "none",
          // Safely add membership fields with default values if they don't exist
          membership_discount: data.membership_discount ?? 0,
          membership_id: data.membership_id ?? null,
          membership_name: data.membership_name ?? null,
          tax_amount: data.tax_amount ?? 0,
          // Add loyalty points fields with default values if they don't exist
          points_earned: data.points_earned ?? 0,
          points_redeemed: data.points_redeemed ?? 0,
          points_discount_amount: data.points_discount_amount ?? 0,
          // Set the mapped status
          status: mappedStatus,
          // Use correct payment method type
          payment_method: data.payment_method as any,
          // Ensure bookings status is typed correctly
          bookings: data.bookings.map((booking: any) => ({
            ...booking,
            status: booking.status || 'booked'
          }))
        };
        
        setAppointment(appointmentData);
      }
    } catch (error) {
      console.error("Error fetching appointment:", error);
      setAppointment(null);
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  return {
    appointment,
    isLoading,
    refetch: fetchAppointment,
  };
}
