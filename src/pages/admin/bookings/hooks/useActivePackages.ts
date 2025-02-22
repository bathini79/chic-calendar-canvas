import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
export const useActivePackages = () => {
    return useQuery({
      queryKey: ["packages"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("packages")
          .select("*")
          .eq("status", "active");
  
        if (error) throw error;
        return data;
  
      },
    });
  };