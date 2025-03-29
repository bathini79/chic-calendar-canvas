
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, format } from 'date-fns';
import { Appointment } from "../types";

export function useAppointmentsByDate(date: Date, locationId?: string) {
  return useQuery({
    queryKey: ['appointments', format(date, 'yyyy-MM-dd'), locationId],
    queryFn: async () => {
      const start = startOfDay(date).toISOString();
      const end = endOfDay(date).toISOString();
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles(*),
          bookings(
            *,
            service:services(*),
            package:packages(*),
            employee:employees!bookings_employee_id_fkey(*)
          )
        `)
        .gte('start_time', start)
        .lte('start_time', end);
      
      // Add location filter if provided
      if (locationId) {
        query = query.eq('location', locationId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    refetchOnWindowFocus: true,
  });
}
