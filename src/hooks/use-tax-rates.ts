
import { useState } from "react";
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

  async function fetchTaxRates() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("tax_rates")
        .select("*")
        .order("name");

      if (error) throw error;
      setTaxRates(data || []);
      return data;
    } catch (error: any) {
      toast.error(`Error fetching tax rates: ${error.message}`);
      return [];
    } finally {
      setIsLoading(false);
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
