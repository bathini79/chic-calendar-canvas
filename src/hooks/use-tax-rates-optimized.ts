import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TaxRate = {
  id: string;
  name: string;
  percentage: number;
  is_default?: boolean;
};

const TAX_RATES_QUERY_KEY = ["tax-rates"];

export function useTaxRatesOptimized() {
  const queryClient = useQueryClient();

  const {
    data: taxRates = [],
    isLoading,
    error,
    refetch: fetchTaxRates,
  } = useQuery({
    queryKey: TAX_RATES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_rates")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as TaxRate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const createMutation = useMutation({
    mutationFn: async (taxRate: Omit<TaxRate, "id">) => {
      const { data, error } = await supabase
        .from("tax_rates")
        .insert(taxRate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAX_RATES_QUERY_KEY });
      toast.success("Tax rate created successfully");
    },
    onError: (error: any) => {
      toast.error(`Error creating tax rate: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      taxRate,
    }: {
      id: string;
      taxRate: Partial<TaxRate>;
    }) => {
      const { data, error } = await supabase
        .from("tax_rates")
        .update(taxRate)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAX_RATES_QUERY_KEY });
      toast.success("Tax rate updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Error updating tax rate: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tax_rates").delete().eq("id", id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAX_RATES_QUERY_KEY });
      toast.success("Tax rate deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Error deleting tax rate: ${error.message}`);
    },
  });

  return {
    taxRates,
    isLoading:
      isLoading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    error,
    fetchTaxRates,
    createTaxRate: createMutation.mutate,
    updateTaxRate: (id: string, taxRate: Partial<TaxRate>) =>
      updateMutation.mutate({ id, taxRate }),
    deleteTaxRate: deleteMutation.mutate,
  };
}
