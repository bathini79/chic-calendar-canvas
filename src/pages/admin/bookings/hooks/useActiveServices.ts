
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useActiveServices(locationId?: string) {
  return useQuery({
    queryKey: ["active-services", locationId],
    queryFn: async () => {
      // First, get all active services
      let query = supabase
        .from("services")
        .select(`
          *,
          category:services_categories(
            category:categories(*)
          )
        `)
        .eq("status", "active");

      const { data: services, error } = await query.order("name");

      if (error) {
        console.error("Error fetching services:", error);
        throw error;
      }

      // If no locationId is provided, return all services
      if (!locationId) {
        return services || [];
      }

      // If locationId is provided, filter services by checking service_locations table
      const { data: serviceLocations, error: locationsError } = await supabase
        .from("service_locations")
        .select("service_id")
        .eq("location_id", locationId);

      if (locationsError) {
        console.error("Error fetching service locations:", locationsError);
        throw locationsError;
      }

      // Get service IDs available at this location
      const serviceIdsAtLocation = serviceLocations.map(item => item.service_id);
      
      // Filter services that are available at the specified location
      const filteredServices = services.filter(service => 
        serviceIdsAtLocation.includes(service.id)
      );

      return filteredServices || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
