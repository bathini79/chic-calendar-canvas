
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
        const { data: packageIds, error: packageIdsError } = await supabase
          .from('package_locations')
          .select('package_id')
          .eq('location_id', locationId);
          
        if (packageIdsError) {
          console.error("Error fetching package locations:", packageIdsError);
          throw packageIdsError;
        }
        
        if (packageIds && packageIds.length > 0) {
          query = query.in('id', packageIds.map(p => p.package_id));
        } else {
          // Return empty array if no packages found for this location
          return [];
        }
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
