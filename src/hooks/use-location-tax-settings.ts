
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
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data || null;
    } catch (error: any) {
      console.error(`Error fetching location tax settings:`, error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchTaxDetails(taxId: string) {
    try {
      if (!taxId) return null;
      
      const { data, error } = await supabase
        .from("tax_rates")
        .select("*")
        .eq("id", taxId)
        .single();
        
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error: any) {
      console.error(`Error fetching tax details:`, error);
      return null;
    }
  }

  // New function to reset location-specific settings
  async function resetLocationSettings() {
    return null;
  }

  return { fetchLocationTaxSettings, fetchTaxDetails, resetLocationSettings, isLoading };
}
