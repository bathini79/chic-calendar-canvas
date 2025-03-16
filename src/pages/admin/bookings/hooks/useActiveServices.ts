
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useActiveServices(locationId?: string) {
  return useQuery({
    queryKey: ["active-services", locationId],
    queryFn: async () => {
      let query = supabase
        .from("services")
        .select(`
          *,
          category:services_categories(
            category:categories(*)
          ),
          service_locations(location_id)
        `)
        .eq("status", "active");

      // If locationId is provided, filter services that are available at this location
      if (locationId) {
        const { data: serviceIds, error: serviceIdsError } = await supabase
          .from('service_locations')
          .select('service_id')
          .eq('location_id', locationId);
          
        if (serviceIdsError) {
          console.error("Error fetching service locations:", serviceIdsError);
          throw serviceIdsError;
        }
        
        if (serviceIds && serviceIds.length > 0) {
          query = query.in('id', serviceIds.map(s => s.service_id));
        } else {
          // Return empty array if no services found for this location
          return [];
        }
      }

      const { data, error } = await query.order("name");

      if (error) {
        console.error("Error fetching services:", error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
