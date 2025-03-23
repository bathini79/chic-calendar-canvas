
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package } from "../types";

export const useActivePackages = (locationId?: string) => {
  const [isLoading, setIsLoading] = useState(false);

  const query = useQuery({
    queryKey: ["packages", locationId],
    queryFn: async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("packages")
          .select(
            `
            *,
            package_services(
              *,
              service:services(*)
            )
          `
          )
          .eq("status", "active");

        if (locationId) {
          const { data: packageIds, error: locationError } = await supabase
            .from("package_locations")
            .select("package_id")
            .eq("location_id", locationId);

          if (locationError) throw locationError;

          if (packageIds && packageIds.length > 0) {
            const ids = packageIds.map((item) => item.package_id);
            query = query.in("id", ids);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        // Map the data to the Package type
        const typedPackages = data.map((pkg) => ({
          ...pkg,
          is_active: pkg.status === 'active',
          // Transform package_services to match expected format
          package_services: pkg.package_services.map((ps: any) => ({
            id: ps.id || `${ps.package_id}_${ps.service_id}`, // Generate an id if not provided
            package_id: ps.package_id,
            service_id: ps.service_id,
            package_selling_price: ps.package_selling_price,
            service: {
              ...ps.service,
              is_active: ps.service.status === 'active',
              cost_price: ps.service.cost_price || ps.service.selling_price * 0.5 // Default cost price if not present
            }
          }))
        } as unknown as Package));

        return typedPackages;
      } catch (error) {
        console.error("Error fetching packages:", error);
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
