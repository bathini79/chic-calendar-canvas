
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package } from "../types";

export function useActivePackages(locationId?: string) {
  return useQuery<Package[]>({
    queryKey: ['activePackages', locationId],
    queryFn: async () => {
      let query = supabase
        .from('packages')
        .select(`
          *,
          package_services(
            service:services(*),
            package_selling_price
          )
        `)
        .eq('status', 'active');
      
      if (locationId) {
        // Get packages associated with this location
        const { data: packageLocations, error: packageLocationsError } = await supabase
          .from('package_locations')
          .select('package_id')
          .eq('location_id', locationId);
        
        if (packageLocationsError) throw packageLocationsError;
        
        // If we have package locations, filter by them
        if (packageLocations && packageLocations.length > 0) {
          const packageIds = packageLocations.map(pl => pl.package_id);
          query = query.in('id', packageIds);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Package[];
    },
  });
}
