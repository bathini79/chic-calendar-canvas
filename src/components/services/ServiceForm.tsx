import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CategoryMultiSelect } from "@/components/categories/CategoryMultiSelect";
import { useState } from "react";

interface ServiceFormData {
  name: string;
  categories: string[];
  original_price: number;
  selling_price: number;
  duration: number;
  description?: string;
}

interface ServiceFormProps {
  initialData?: any;
  onSubmit: (data: ServiceFormData) => void;
  onCancel: () => void;
}

export function ServiceForm({ initialData, onSubmit, onCancel }: ServiceFormProps) {
  // Initialize selectedCategories with IDs only
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.categories?.map((cat: any) => cat.id) || []
  );

  const form = useForm<ServiceFormData>({
    defaultValues: {
      name: initialData?.name || '',
      categories: selectedCategories,
      original_price: initialData?.original_price || 0,
      selling_price: initialData?.selling_price || 0,
      duration: initialData?.duration || 0,
      description: initialData?.description || '',
    },
  });

  const handleCategorySelect = (categoryId: string) => {
    const newCategories = [...selectedCategories, categoryId];
    setSelectedCategories(newCategories);
    form.setValue('categories', newCategories);
  };

  const handleCategoryRemove = (categoryId: string) => {
    const newCategories = selectedCategories.filter(id => id !== categoryId);
    setSelectedCategories(newCategories);
    form.setValue('categories', newCategories);
  };

  const handleSubmit = (data: ServiceFormData) => {
    onSubmit({
      ...data,
      categories: selectedCategories,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categories"
          render={() => (
            <FormItem>
              <FormLabel>Categories</FormLabel>
              <FormControl>
                <CategoryMultiSelect
                  selectedCategories={selectedCategories}
                  onCategorySelect={handleCategorySelect}
                  onCategoryRemove={handleCategoryRemove}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="original_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Original Price (₹)</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="selling_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Selling Price (₹)</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update Service' : 'Create Service'}
          </Button>
        </div>
      </form>
    </Form>
  );
}