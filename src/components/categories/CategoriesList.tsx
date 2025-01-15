import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CategoriesListProps {
  categories: any[];
  onEdit: (category: any) => void;
  onDelete: () => void;
}

const CategoriesList = ({ categories, onEdit, onDelete }: CategoriesListProps) => {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      const { data: servicesUsingCategory, error: checkError } = await supabase
        .from("services_categories")
        .select("service_id")
        .eq("category_id", id);

      if (checkError) {
        toast({
          variant: "destructive",
          title: "Error checking category usage",
          description: checkError.message,
        });
        return;
      }

      if (servicesUsingCategory && servicesUsingCategory.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot delete category",
          description: `This category is being used by ${servicesUsingCategory.length} service(s). Please remove it from all services first.`,
        });
        return;
      }

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) {
        if (error.code === "42501") {
          toast({
            variant: "destructive",
            title: "Permission denied",
            description: "You don't have permission to delete categories. Only admin users can perform this action.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error deleting category",
            description: error.message,
          });
        }
        return;
      }

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      onDelete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Name</TableHead>
              <TableHead className="w-[25%]">Created At</TableHead>
              <TableHead className="w-[25%]">Updated At</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>{new Date(category.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(category.updated_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CategoriesList;