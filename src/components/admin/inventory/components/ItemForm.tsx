
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema, type ItemFormValues } from "../schemas/item-schema";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ItemFormProps {
  defaultValues: ItemFormValues;
  onSubmit: (values: ItemFormValues) => Promise<void>;
}

export function ItemForm({ defaultValues, onSubmit }: ItemFormProps) {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues,
  });

  const { data: categories } = useSupabaseCrud("inventory_categories");
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultValues.categories[0] || "");

  useEffect(() => {
    if (defaultValues.categories[0]) {
      setSelectedCategory(defaultValues.categories[0]);
    }
  }, [defaultValues.categories]);

  const handleSubmit = async (values: ItemFormValues) => {
    const formValues = {
      ...values,
      categories: selectedCategory ? [selectedCategory] : []
    };
    await onSubmit(formValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="name"
            {...form.register("name")}
          />
        </div>
        <div>
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="description"
            {...form.register("description")}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="quantity" className="text-sm font-medium">
              Quantity
            </label>
            <Input
              id="quantity"
              type="number"
              min="0"
              {...form.register("quantity", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label htmlFor="minimumQuantity" className="text-sm font-medium">
              Minimum Quantity
            </label>
            <Input
              id="minimumQuantity"
              type="number"
              min="0"
              {...form.register("minimum_quantity", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label htmlFor="maxQuantity" className="text-sm font-medium">
              Maximum Quantity
            </label>
            <Input
              id="maxQuantity"
              type="number"
              min="0"
              {...form.register("max_quantity", { valueAsNumber: true })}
            />
          </div>
        </div>
        <div>
          <label htmlFor="unitPrice" className="text-sm font-medium">
            Unit Price
          </label>
          <Input
            id="unitPrice"
            type="number"
            min="0"
            step="0.01"
            {...form.register("unit_price", { valueAsNumber: true })}
          />
        </div>
        <div>
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full">
          {defaultValues.name ? 'Update' : 'Create'} Item
        </Button>
      </form>
    </Form>
  );
}
