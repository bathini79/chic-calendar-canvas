
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppointmentStatus } from "@/pages/admin/bookings/types";

export function useAppointmentDetails() {
  const [isLoading, setIsLoading] = useState(false);

  async function fetchAppointmentDetails(appointmentId: string) {
    if (!appointmentId) {
      console.log("No appointment ID provided");
      return null;
    }
    
    try {
      setIsLoading(true);
      
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

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error("Error fetching appointment details:", error);
      toast.error(error.message || "Failed to fetch appointment details");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
    if (!appointmentId) {
      console.log("No appointment ID provided");
      return false;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", appointmentId);

      if (error) {
        throw error;
      }

      toast.success(`Appointment ${status} successfully`);
      return true;
    } catch (error: any) {
      console.error("Error updating appointment status:", error);
      toast.error(error.message || "Failed to update appointment status");
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    fetchAppointmentDetails,
    updateAppointmentStatus
  };
}
