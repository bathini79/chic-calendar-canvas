import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Custom hook for fetching active services
export const useActiveServices = () => {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });
};