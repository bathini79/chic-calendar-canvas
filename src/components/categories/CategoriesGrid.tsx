import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CategoriesGridProps {
  categories: any[];
  onEdit: (category: any) => void;
  onDelete: () => void;
}

const CategoriesGrid = ({ categories, onEdit, onDelete }: CategoriesGridProps) => {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {categories.map((category) => (
        <Card key={category.id} className="group relative">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">{category.name}</h3>
            <div className="text-sm text-muted-foreground mt-2">
              <p>Created: {new Date(category.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(category.updated_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
          <CardFooter className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-2">
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
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default CategoriesGrid;