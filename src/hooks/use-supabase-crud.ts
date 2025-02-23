
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type TableName = keyof Database['public']['Tables']
type Row<T extends TableName> = Database['public']['Tables'][T]['Row']
type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert']
type Update<T extends TableName> = Database['public']['Tables'][T]['Update']

export function useSupabaseCrud<T extends TableName>(tableName: T) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [tableName],
    queryFn: async () => {
      const { data: result, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;
      return result as Row<T>[];
    },
  });

  const create = async (newData: Insert<T>): Promise<Row<T>> => {
    try {
      const { data: insertedData, error } = await supabase
        .from(tableName)
        .insert([newData as any])
        .select()
        .single();

      if (error) throw error;
      toast.success("Created successfully");
      refetch();
      return insertedData as Row<T>;
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const update = async (id: string | number, updateData: Update<T>): Promise<Row<T>> => {
    try {
      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update(updateData as any)
        .eq('id' as any, id)
        .select()
        .single();

      if (error) throw error;
      toast.success("Updated successfully");
      refetch();
      return updatedData as Row<T>;
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const remove = async (id: string | number) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id' as any, id);

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
