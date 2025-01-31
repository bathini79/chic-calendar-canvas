import { PostgrestError } from '@supabase/supabase-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];
type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];
type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type Update<T extends TableName> = Database['public']['Tables'][T]['Update'];

export function useSupabaseCrud<T extends TableName>(tableName: T) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Row<T>[];
    },
  });

  const { mutateAsync: create } = useMutation({
    mutationFn: async (newItem: Insert<T>) => {
      const { data, error } = await supabase
        .from(tableName)
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;
      return data as Row<T>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Created successfully');
    },
    onError: (error: PostgrestError) => {
      toast.error(error.message);
    },
  });

  const { mutateAsync: update } = useMutation({
    mutationFn: async ({ id, ...updateData }: Update<T> & { id: string }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Row<T>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Updated successfully');
    },
    onError: (error: PostgrestError) => {
      toast.error(error.message);
    },
  });

  const { mutateAsync: remove } = useMutation({
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
    data,
    isLoading,
    error,
    create,
    update,
    remove,
  };
}