import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

export function useSupabaseCrud<T extends TableName>(tableName: T) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;
      return data as Tables[T]['Row'][];
    },
  });

  const create = async (newData: Tables[T]['Insert']) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert(newData)
        .select()
        .single();

      if (error) throw error;
      toast.success("Created successfully");
      refetch();
      return data as Tables[T]['Row'];
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const update = async (id: string, updateData: Partial<Tables[T]['Update']>) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success("Updated successfully");
      refetch();
      return data as Tables[T]['Row'];
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  return {
    data,
    isLoading,
    error,
    create,
    update,
    remove,
    refetch,
  };
}