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
        const { data, error } = await supabase
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

        if (error) throw error;

        // Map the data to the Package type
        const typedPackages = data.map((pkg) => ({
          ...pkg,
          is_active: pkg.status === 'active',
        } as Package));

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
