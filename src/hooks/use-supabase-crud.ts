import { PostgrestError } from '@supabase/supabase-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type TableName = keyof Tables;

interface BaseRecord {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export function useSupabaseCrud<T extends BaseRecord>(table: TableName) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as T[];
    },
  });

  const { mutateAsync: create } = useMutation({
    mutationFn: async (newItem: Partial<T>) => {
      const { data, error } = await supabase
        .from(table)
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success('Created successfully');
    },
    onError: (error: PostgrestError) => {
      toast.error(error.message);
    },
  });

  const { mutateAsync: update } = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<T> & { id: string }) => {
      const { data, error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success('Updated successfully');
    },
    onError: (error: PostgrestError) => {
      toast.error(error.message);
    },
  });

  const { mutateAsync: remove } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success('Deleted successfully');
    },
    onError: (error: PostgrestError) => {
      toast.error(error.message);
    },
  });

  return {
    data,
    isLoading,
    error,
    create,
    update,
    remove,
  };
}