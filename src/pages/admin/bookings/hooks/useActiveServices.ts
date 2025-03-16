
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
          )
        `)
        .eq("status", "active");

      // If locationId is provided, filter services that are available at this location
      if (locationId) {
        // This could be adjusted based on your business logic
        // For now, we're not filtering by location, as services might be available at any location
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
