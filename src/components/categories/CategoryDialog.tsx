import React from "react";
import { useForm } from "react-hook-form";
import { useSession } from "@supabase/auth-helpers-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export const CategoryDialog = ({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryDialogProps) => {
  const { toast } = useToast();
  const session = useSession();
  
  const form = useForm({
    defaultValues: {
      name: category?.name || "",
    },
  });

  // Reset form when category changes
  React.useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
      });
    } else {
      form.reset({
        name: "",
      });
    }
  }, [category, form]);

  const onSubmit = async (values: { name: string }) => {
    if (!session) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to perform this action.",
      });
      return;
    }

    try {
      if (category) {
        const { error } = await supabase
          .from("categories")
          .update({ name: values.name })
          .eq("id", category.id);

        if (error) {
          if (error.code === "42501") {
            toast({
              variant: "destructive",
              title: "Permission denied",
              description: "You don't have permission to update categories. Only admin users can perform this action.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Error updating category",
              description: error.message,
            });
          }
          return;
        }

        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([{ name: values.name }]);

        if (error) {
          if (error.code === "42501") {
            toast({
              variant: "destructive",
              title: "Permission denied",
              description: "You don't have permission to create categories. Only admin users can perform this action.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Error creating category",
              description: error.message,
            });
          }
          return;
        }

        toast({
          title: "Success",
          description: "Category created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit Category" : "Create Category"}
          </DialogTitle>
          <DialogDescription>
            {category 
              ? "Update the details of an existing category."
              : "Create a new category for organizing services."
            }
          </DialogDescription>
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