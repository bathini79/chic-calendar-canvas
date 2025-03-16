
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Service } from "../types";

export function useActiveServices(locationId?: string) {
  return useQuery<Service[]>({
    queryKey: ['activeServices', locationId],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select(`
          *,
          services_categories(
            categories(
              id,
              name
            )
          )
        `)
        .eq('status', 'active');
      
      if (locationId) {
        // Get services associated with this location
        const { data: serviceLocations, error: serviceLocationsError } = await supabase
          .from('service_locations')
          .select('service_id')
          .eq('location_id', locationId);
        
        if (serviceLocationsError) throw serviceLocationsError;
        
        // If we have service locations, filter by them
        if (serviceLocations && serviceLocations.length > 0) {
          const serviceIds = serviceLocations.map(sl => sl.service_id);
          query = query.in('id', serviceIds);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Service[];
    },
  });
}
