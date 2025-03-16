
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useActivePackages(locationId?: string) {
  return useQuery({
    queryKey: ["active-packages", locationId],
    queryFn: async () => {
      let query = supabase
        .from("packages")
        .select(`
          *,
          categories:package_categories(
            category:categories(*)
          ),
          package_services(
            service:services(*)
          ),
          package_locations(location_id)
        `)
        .eq("status", "active");

      // If locationId is provided, filter packages that are available at this location
      if (locationId) {
        // Get packages available at the specified location
        query = query.contains('package_locations', [{ location_id: locationId }]);
      }

      const { data, error } = await query.order("name");

      if (error) {
        console.error("Error fetching packages:", error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
