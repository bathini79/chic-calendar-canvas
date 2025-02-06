import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type Tables = Database['public']['Tables'];

export function useSupabaseCrud<T extends keyof Tables>(tableName: T) {
  type Row = Tables[T]['Row'];
  type Insert = Tables[T]['Insert'];
  type Update = Tables[T]['Update'];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;
      return data as Row[];
    },
  });

  const create = async (newData: Insert) => {
    try {
      const { data: insertedData, error } = await supabase
        .from(tableName)
        .insert([newData])
        .select()
        .single();

      if (error) throw error;
      toast.success("Created successfully");
      refetch();
      return insertedData as Row;
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const update = async (id: string, updateData: Update) => {
    try {
      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success("Updated successfully");
      refetch();
      return updatedData as Row;
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