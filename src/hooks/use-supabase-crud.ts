import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";

type TableNames = 'categories' | 'package_services' | 'packages' | 'services' | 'profiles' | 'services_categories';

interface CrudOptions {
  table: TableNames;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

export function useSupabaseCrud({ table }: CrudOptions) {
  const { toast } = useToast();
  const session = useSession();

  const handleError = (error: any) => {
    if (error.code === "42501") {
      toast({
        variant: "destructive",
        title: "Permission denied",
        description: `You don't have permission to modify ${table}. Only admin users can perform this action.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: `Error with ${table}`,
        description: error.message,
      });
    }
    return null;
  };

  const create = async <T extends Record<string, any>>(data: T) => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) return handleError(error);

      toast({
        title: "Success",
        description: `${table} created successfully`,
      });
      return result;
    } catch (error: any) {
      return handleError(error);
    }
  };

  const update = async <T extends Record<string, any>>(id: string, data: T) => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) return handleError(error);

      toast({
        title: "Success",
        description: `${table} updated successfully`,
      });
      return result;
    } catch (error: any) {
      return handleError(error);
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) return handleError(error);

      toast({
        title: "Success",
        description: `${table} deleted successfully`,
      });
      return true;
    } catch (error: any) {
      return handleError(error);
    }
  };

  return {
    create,
    update,
    remove,
  };
}