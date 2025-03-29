
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type LocationTaxSettings = {
  id: string;
  location_id: string;
  service_tax_id: string | null;
  product_tax_id: string | null;
  created_at: string;
  updated_at: string;
};

export function useLocationTaxSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [locationSettings, setLocationSettings] = useState<Record<string, LocationTaxSettings | null>>({});

  const fetchLocationTaxSettings = useCallback(async (locationId: string) => {
    // If we've already fetched settings for this location, return from cache
    if (locationSettings[locationId] !== undefined) {
      return locationSettings[locationId];
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('location_tax_settings')
        .select('*')
        .eq('location_id', locationId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is not really an error
          console.error("Error fetching location tax settings:", error);
        }
        // Store null in cache to avoid repeated fetches for non-existent settings
        setLocationSettings(prev => ({ ...prev, [locationId]: null }));
        return null;
      }

      setLocationSettings(prev => ({ ...prev, [locationId]: data }));
      return data as LocationTaxSettings;
    } catch (error: any) {
      console.error("Error in fetchLocationTaxSettings:", error);
      toast.error(`Failed to load tax settings: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [locationSettings]);

  const resetLocationSettings = useCallback((locationId: string) => {
    setLocationSettings(prev => {
      const newSettings = { ...prev };
      delete newSettings[locationId];
      return newSettings;
    });
  }, []);

  return {
    isLoading,
    fetchLocationTaxSettings,
    resetLocationSettings
  };
}
