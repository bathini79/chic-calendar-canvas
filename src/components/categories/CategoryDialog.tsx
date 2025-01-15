import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { categoryFormSchema, type CategoryFormValues } from "@/lib/validations/form-schemas";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: any;
  onSuccess: () => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryDialogProps) {
  const { create, update } = useSupabaseCrud({ table: 'categories' });
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || "",
    },
  });

  React.useEffect(() => {
    if (category) {
      form.reset({ name: category.name });
    } else {
      form.reset({ name: "" });
    }
  }, [category, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    const result = category
      ? await update(category.id, values)
      : await create(values);

    if (result) {
      onSuccess();
      onOpenChange(false);
      form.reset();
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? "Edit Category" : "Create Category"}
      description={category 
        ? "Update the details of an existing category."
        : "Create a new category for organizing services."
      }
      form={form}
      onSubmit={onSubmit}
      submitLabel={category ? "Update" : "Create"}
      className="max-h-[90vh]"
      contentClassName="p-0"
    >
      <ScrollArea className="max-h-[calc(90vh-200px)]">
        <div className="p-6">
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
        </div>
      </ScrollArea>
    </FormDialog>
  );
}