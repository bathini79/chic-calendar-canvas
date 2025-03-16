
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useActivePackages(locationId?: string) {
  return useQuery({
    queryKey: ["active-packages", locationId],
    queryFn: async () => {
      // First, get all active packages
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

      const { data: packages, error } = await query.order("name");

      if (error) {
        console.error("Error fetching packages:", error);
        throw error;
      }

      // If no locationId is provided, return all packages
      if (!locationId) {
        return packages || [];
      }

      // If locationId is provided, filter packages by checking package_locations table
      const { data: packageLocations, error: locationsError } = await supabase
        .from("package_locations")
        .select("package_id")
        .eq("location_id", locationId);

      if (locationsError) {
        console.error("Error fetching package locations:", locationsError);
        throw locationsError;
      }

      // Get package IDs available at this location
      const packageIdsAtLocation = packageLocations.map(item => item.package_id);
      
      // Filter packages that are available at the specified location
      const filteredPackages = packages.filter(pkg => 
        packageIdsAtLocation.includes(pkg.id)
      );

      return filteredPackages || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
