import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CategoryFormValues {
  name: string;
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: { id: string; name: string };
}

export function CategoryDialog({ open, onOpenChange, initialData }: CategoryDialogProps) {
  const queryClient = useQueryClient();

  const handleSubmit = async (values: CategoryFormValues) => {
    try {
      if (initialData) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: values.name,
          })
          .eq('id', initialData.id)
          .select()
          .single();

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            name: values.name,
          })
          .select()
          .single();

        if (error) throw error;
      }

      toast.success(initialData ? "Category updated" : "Category created");
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Category" : "Create Category"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update the category details." : "Fill in the details to create a new category."}
          </DialogDescription>
        </DialogHeader>
        {/* Form fields for category name */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Category Name"
            defaultValue={initialData?.name}
            className="input"
            required
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initialData ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
