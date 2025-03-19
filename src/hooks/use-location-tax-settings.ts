
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LocationTaxSettings = {
  id: string;
  location_id: string;
  service_tax_id: string | null;
  product_tax_id: string | null;
  created_at: string;
  updated_at: string;
};

export function useLocationTaxSettings() {
  const [isLoading, setIsLoading] = useState(false);

  async function fetchLocationTaxSettings(locationId: string) {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("location_tax_settings")
        .select("*, service_tax:service_tax_id(id, name, percentage), product_tax:product_tax_id(id, name, percentage)")
        .eq("location_id", locationId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }
      
      return data;
    } catch (error: any) {
      console.error("Error fetching location tax settings:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    fetchLocationTaxSettings
  };
}
