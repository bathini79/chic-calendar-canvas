
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

  return { taxRates, fetchTaxRates, isLoading };
}
