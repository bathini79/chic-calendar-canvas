
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type LocationTaxSettings = {
  id: string;
  location_id: string;
  service_tax_id: string | null;
  product_tax_id: string | null;
};

export function useLocationTaxSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const settingsCache = useRef<Record<string, { data: LocationTaxSettings | null, timestamp: number }>>({});
  const taxDetailsCache = useRef<Record<string, { data: any, timestamp: number }>>({});
  const cacheTimeoutMs = 30000; // 30 seconds cache validity
  const fetchInProgressRef = useRef<Record<string, boolean>>({});
  
  async function fetchLocationTaxSettings(locationId: string) {
    // Check if we have a valid cached version
    const currentTime = Date.now();
    const cachedSettings = settingsCache.current[locationId];
    
    if (cachedSettings && currentTime - cachedSettings.timestamp < cacheTimeoutMs) {
      return cachedSettings.data;
    }
    
    // Prevent concurrent fetches for the same location
    if (fetchInProgressRef.current[`settings_${locationId}`]) {
      return cachedSettings?.data || null;
    }

    try {
      fetchInProgressRef.current[`settings_${locationId}`] = true;
      setIsLoading(true);
      const { data, error } = await supabase
        .from("location_tax_settings")
        .select("*")
        .eq("location_id", locationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // Cache the result
      settingsCache.current[locationId] = { 
        data: data || null, 
        timestamp: currentTime 
      };
      
      return data || null;
    } catch (error: any) {
      console.error(`Error fetching location tax settings:`, error);
      return null;
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current[`settings_${locationId}`] = false;
    }
  }

  async function fetchTaxDetails(taxId: string) {
    if (!taxId) return null;
    
    // Check cache
    const currentTime = Date.now();
    const cachedDetails = taxDetailsCache.current[taxId];
    
    if (cachedDetails && currentTime - cachedDetails.timestamp < cacheTimeoutMs) {
      return cachedDetails.data;
    }
    
    // Prevent concurrent fetches for the same tax
    if (fetchInProgressRef.current[`tax_${taxId}`]) {
      return cachedDetails?.data || null;
    }
    
    try {
      fetchInProgressRef.current[`tax_${taxId}`] = true;
      const { data, error } = await supabase
        .from("tax_rates")
        .select("*")
        .eq("id", taxId)
        .single();
        
      if (error) {
        throw error;
      }
      
      // Cache the result
      taxDetailsCache.current[taxId] = {
        data,
        timestamp: currentTime
      };
      
      return data;
    } catch (error: any) {
      console.error(`Error fetching tax details:`, error);
      return null;
    } finally {
      fetchInProgressRef.current[`tax_${taxId}`] = false;
    }
  }

  // Function to reset location-specific settings
  async function resetLocationSettings(locationId: string) {
    try {
      setIsLoading(true);
      
      // Clear the cache for this location
      delete settingsCache.current[locationId];
      
      // Fetch new settings for the changed location
      const settings = await fetchLocationTaxSettings(locationId);
      
      return settings;
    } catch (error) {
      console.error("Error resetting location settings:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { fetchLocationTaxSettings, fetchTaxDetails, resetLocationSettings, isLoading };
}
