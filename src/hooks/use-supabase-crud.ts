import { PostgrestError } from '@supabase/supabase-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TableName = 'services' | 'packages' | 'categories' | 'employees';

interface BaseRecord {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export function useSupabaseCrud<T extends BaseRecord>(tableName: TableName) {
  const queryClient = useQueryClient();

  const getAll = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as T[];
    },
  });

  const create = useMutation({
    mutationFn: async (newItem: Partial<T>) => {
      const { data, error } = await supabase
        .from(tableName)
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Created successfully');
    },
    onError: (error: PostgrestError) => {
      toast.error(error.message);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<T> & { id: string }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Updated successfully');
    },
    onError: (error: PostgrestError) => {
      toast.error(error.message);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Deleted successfully');
    },
    onError: (error: PostgrestError) => {
      toast.error(error.message);
    },
  });

  return {
    data: getAll.data,
    isLoading: getAll.isLoading,
    error: getAll.error,
    create,
    update,
    remove,
  };
}