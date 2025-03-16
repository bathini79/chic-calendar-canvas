
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
        // Get services where the service is available at the specified location
        query = query.contains('service_locations', [{ location_id: locationId }]);
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
