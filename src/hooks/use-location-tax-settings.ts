
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type LocationTaxSettings = {
  id: string;
  location_id: string;
  service_tax_id: string | null;
  product_tax_id: string | null;
};

export function useLocationTaxSettings() {
  const [isLoading, setIsLoading] = useState(false);
  
  async function fetchLocationTaxSettings(locationId: string) {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("location_tax_settings")
        .select("*")
        .eq("location_id", locationId)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching location tax settings:`, error);
        return null;
      }
      
      return data;
    } catch (error: any) {
      console.error(`Error fetching location tax settings:`, error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { fetchLocationTaxSettings, isLoading };
}
