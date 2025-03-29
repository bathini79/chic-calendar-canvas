
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TaxRate = {
  id: string;
  name: string;
  percentage: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export function useTaxRates() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const fetchInProgress = useRef(false);

  const fetchTaxRates = useCallback(async () => {
    // If we've already loaded tax rates, don't fetch again
    if (isInitialized && taxRates.length > 0) {
      return taxRates;
    }
    
    // Skip if a fetch is already in progress
    if (fetchInProgress.current) {
      console.log("Skipping tax rates fetch - already in progress");
      return taxRates;
    }
    
    fetchInProgress.current = true;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setTaxRates(data);
      setIsInitialized(true);
      return data;
    } catch (error: any) {
      console.error("Error fetching tax rates:", error);
      toast.error(`Failed to load tax rates: ${error.message}`);
      return [];
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, [taxRates, isInitialized]);

  // Load tax rates on first mount
  useEffect(() => {
    if (!isInitialized && !fetchInProgress.current) {
      fetchTaxRates();
    }
  }, [fetchTaxRates, isInitialized]);

  return {
    taxRates,
    isLoading,
    fetchTaxRates
  };
}
