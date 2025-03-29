
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TaxRate = {
  id: string;
  name: string;
  percentage: number;
  is_default?: boolean;
};

export function useTaxRates() {
  const [isLoading, setIsLoading] = useState(false);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const fetchInProgressRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const cacheTimeoutMs = 30000; // 30 seconds cache validity

  async function fetchTaxRates() {
    // If a fetch is already in progress or if the cache is still valid, return existing data
    const currentTime = Date.now();
    if (
      fetchInProgressRef.current || 
      (taxRates.length > 0 && currentTime - lastFetchTimeRef.current < cacheTimeoutMs)
    ) {
      return taxRates;
    }

    try {
      fetchInProgressRef.current = true;
      setIsLoading(true);
      const { data, error } = await supabase
        .from("tax_rates")
        .select("*")
        .order("name");

      if (error) throw error;
      setTaxRates(data || []);
      lastFetchTimeRef.current = currentTime;
      return data;
    } catch (error: any) {
      console.error(`Error fetching tax rates:`, error);
      toast.error(`Error fetching tax rates: ${error.message}`);
      return [];
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }

  async function createTaxRate(taxRate: Omit<TaxRate, 'id'>) {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("tax_rates")
        .insert(taxRate)
        .select()
        .single();

      if (error) throw error;
      
      await fetchTaxRates();
      toast.success("Tax rate created successfully");
      return data;
    } catch (error: any) {
      toast.error(`Error creating tax rate: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateTaxRate(id: string, taxRate: Partial<TaxRate>) {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("tax_rates")
        .update(taxRate)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      await fetchTaxRates();
      toast.success("Tax rate updated successfully");
      return data;
    } catch (error: any) {
      toast.error(`Error updating tax rate: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteTaxRate(id: string) {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("tax_rates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      await fetchTaxRates();
      toast.success("Tax rate deleted successfully");
      return true;
    } catch (error: any) {
      toast.error(`Error deleting tax rate: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  return { taxRates, fetchTaxRates, isLoading, createTaxRate, updateTaxRate, deleteTaxRate };
}
