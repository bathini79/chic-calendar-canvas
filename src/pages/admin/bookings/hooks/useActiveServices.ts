
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Service } from "../types";

export const useActiveServices = (locationId?: string) => {
  const [isLoading, setIsLoading] = useState(false);

  const query = useQuery({
    queryKey: ["services", locationId],
    queryFn: async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("services")
          .select(
            `
            *,
            services_categories(
              category:categories(*)
            )
          `
          )
          .eq("status", "active");

        if (locationId) {
          const { data: serviceIds, error: locationError } = await supabase
            .from("service_locations")
            .select("service_id")
            .eq("location_id", locationId);

          if (locationError) throw locationError;

          if (serviceIds && serviceIds.length > 0) {
            const ids = serviceIds.map((item) => item.service_id);
            query = query.in("id", ids);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        // Map the data to the Service type
        const typedServices = data.map((service) => ({
          ...service,
          is_active: service.status === 'active',
          cost_price: service.original_price || service.selling_price * 0.5, // Use original_price as cost_price
          category: service.services_categories?.[0]?.category
        } as unknown as Service));

        return typedServices;
      } catch (error) {
        console.error("Error fetching services:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
  });

  return {
    data: query.data || [],
    isLoading: isLoading || query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
