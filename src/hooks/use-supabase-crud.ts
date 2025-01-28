import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TableNames = 'services' | 'categories' | 'packages' | 'employees' | 'bookings' | 'cart_items';

export function useSupabaseCrud<T extends Record<string, any>>(tableName: TableNames) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) {
        toast.error(`Error fetching ${tableName}`);
        throw error;
      }

      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newItem: Partial<T>) => {
      const { data, error } = await supabase
        .from(tableName)
        .insert([newItem as any])
        .select()
        .single();

      if (error) {
        toast.error(`Error creating ${tableName}`);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success(`${tableName} created successfully`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<T> & { id: string }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast.error(`Error updating ${tableName}`);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success(`${tableName} updated successfully`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        toast.error(`Error deleting ${tableName}`);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success(`${tableName} deleted successfully`);
    },
  });

  return {
    data,
    isLoading,
    error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
  };
}