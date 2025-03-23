
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Appointment } from "../types";

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
        // Handle location field mapping
        const appointmentData = {
          ...data,
          location_id: data.location || null, // Map location to location_id for compatibility
          discount_type: (data.discount_type as "none" | "percentage" | "fixed") || "none",
          // Convert bookings to the correct type
          bookings: data.bookings as any
        } as Appointment;
        
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
