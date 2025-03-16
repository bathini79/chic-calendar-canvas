
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema, type ItemFormValues } from "../schemas/item-schema";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UnitSection } from "./item-form/UnitSection";
import { QuantitySection } from "./item-form/QuantitySection";
import { SupplierSection } from "./item-form/SupplierSection";
import { StatusSection } from "./item-form/StatusSection";
import { CategorySection } from "./item-form/CategorySection";
import { LocationSection } from "./item-form/LocationSection";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

interface ItemFormProps {
  defaultValues: ItemFormValues;
  onSubmit: (values: ItemFormValues) => Promise<void>;
}

export function ItemForm({ defaultValues, onSubmit }: ItemFormProps) {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['inventory_units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_units')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['inventory_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  return (
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
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <LocationSection control={form.control} />

        <QuantitySection control={form.control} register={form.register} />

        <FormField
          control={form.control}
          name="unit_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <CategorySection
          value={form.watch("categories")}
          onValueChange={(values) => form.setValue("categories", values)}
          categories={categories}
        />

        <UnitSection
          value={form.watch("unit_of_quantity")}
          onValueChange={(value) => form.setValue("unit_of_quantity", value)}
          units={units}
        />

        <SupplierSection
          value={form.watch("supplier_id")}
          onValueChange={(value) => form.setValue("supplier_id", value)}
          suppliers={suppliers}
        />

        <StatusSection
          value={form.watch("status")}
          onValueChange={(value) => form.setValue("status", value as "active" | "inactive")}
        />

        <Button type="submit" className="w-full">
          {defaultValues.name ? 'Update' : 'Create'} Item
        </Button>
      </form>
    </Form>
  );
}
