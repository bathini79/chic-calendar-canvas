
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type TableName = keyof Database['public']['Tables']

export function useSupabaseCrud<T extends TableName>(tableName: T) {
  type TableDefinition = Database['public']['Tables'][T]
  type Row = TableDefinition['Row']
  type Insert = TableDefinition['Insert']
  type Update = TableDefinition['Update']

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data: result, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;
      return result as Row[];
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

  const update = async (recordId: string, updateData: Update) => {
    try {
      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', recordId)
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

  const remove = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', recordId);

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
