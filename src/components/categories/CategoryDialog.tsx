import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: any;
  onSuccess: () => void;
}

const CategoryDialog = ({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryDialogProps) => {
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      name: category?.name || "",
    },
  });

  const onSubmit = async (values: { name: string }) => {
    if (category) {
      // Update existing category
      const { error } = await supabase
        .from("categories")
        .update({ name: values.name })
        .eq("id", category.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error updating category",
          description: error.message,
        });
        return;
      }

      toast({
        title: "Category updated",
        description: "The category has been successfully updated.",
      });
    } else {
      // Create new category
      const { error } = await supabase.from("categories").insert([
        {
          name: values.name,
        },
      ]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error creating category",
          description: error.message,
        });
        return;
      }

      toast({
        title: "Category created",
        description: "The category has been successfully created.",
      });
    }

    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit Category" : "Create Category"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {category ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;