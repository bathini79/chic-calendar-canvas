
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
          )
        `)
        .eq("status", "active");

      // If locationId is provided, filter packages that are available at this location
      if (locationId) {
        // This could be adjusted based on your business logic
        // For now, we're not filtering by location, as packages might be available at any location
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
