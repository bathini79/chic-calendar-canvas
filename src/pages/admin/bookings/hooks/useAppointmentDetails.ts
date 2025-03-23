
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppointmentStatus, Appointment } from "@/pages/admin/bookings/types";

export function useAppointmentDetails() {
  const [isLoading, setIsLoading] = useState(false);

  async function fetchAppointmentDetails(appointmentId: string) {
    if (!appointmentId || appointmentId === "") {
      console.log("No appointment ID provided or empty ID");
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

      // Handle potential missing fields by providing default values
      const processedData = {
        ...data,
        membership_discount: data.membership_discount || 0,
        membership_id: data.membership_id || null,
        membership_name: data.membership_name || null,
        tax_amount: data.tax_amount || 0
      };

      return processedData as Appointment;
    } catch (error: any) {
      console.error("Error fetching appointment details:", error);
      toast.error(error.message || "Failed to fetch appointment details");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
    if (!appointmentId || appointmentId === "") {
      console.log("No appointment ID provided or empty ID");
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
