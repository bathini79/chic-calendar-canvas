
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Appointment } from "../types";

export const useAppointmentsByDate = (currentDate: Date) => {
    console.log("Fetching appointments for date:", format(currentDate, "yyyy-MM-dd"));
    
    return useQuery({
      queryKey: ["appointments", format(currentDate, "yyyy-MM-dd")],
      queryFn: async () => {
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
  
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log("Query date range:", {
          start: startOfDay.toISOString(),
          end: endOfDay.toISOString()
        });
  
        const { data, error } = await supabase
          .from("appointments")
          .select(
            `
            *,
            bookings (
              *,
              service:services (*),
              package:packages (*),
              employee:employees!bookings_employee_id_fkey (
                id,
                name,
                email,
                phone,
                photo_url,
                employment_type,
                status
              )
            ),
            customer:profiles (
              id,
              full_name,
              email,
              phone_number,
              role,
              created_at,
              updated_at
            )
          `
          )
          .gte("start_time", startOfDay.toISOString())
          .lte("start_time", endOfDay.toISOString());

        if (error) {
          console.error("Error fetching appointments:", error);
          throw error;
        }

        console.log("Fetched appointments:", data);

        if (!data) {
          console.log("No appointments found for the date");
          return [];
        }

        return data as Appointment[];
      }
    });
};
