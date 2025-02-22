import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
export const useAppointmentsByDate = (currentDate: Date) => {
    return useQuery({
      queryKey: ["appointments", format(currentDate, "yyyy-MM-dd")],
      queryFn: async () => {
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
  
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);
  
        const { data, error } = await supabase
          .from("appointments")
          .select(
            `
            *,
            bookings (
              *,
              service:services (*),
              package:packages (*),
              employee:employees (*)
            ),
            customer:profiles (*)
          `
          )
          .gte("start_time", startOfDay.toISOString())
          .lte("start_time", endOfDay.toISOString());
  
        if (error) throw error;
        return data;
      },
    });
  };