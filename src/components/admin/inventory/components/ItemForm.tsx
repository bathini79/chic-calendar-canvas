
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus } from "lucide-react";

interface ItemFormProps {
  defaultValues: ItemFormValues;
  onSubmit: (values: ItemFormValues) => Promise<void>;
}

export function ItemForm({ defaultValues, onSubmit }: ItemFormProps) {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "locationItems"
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

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    }
  });

  const handleAddLocation = () => {
    append({
      location_id: "",
      quantity: 0,
      minimum_quantity: 0,
      max_quantity: 100,
      unit_price: 0,
      categories: [],
      status: "active",
      supplier_id: "_none",
    });
  };

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

        <UnitSection
          value={form.watch("unit_of_quantity")}
          onValueChange={(value) => form.setValue("unit_of_quantity", value)}
          units={units}
        />

        <Separator className="my-4" />
        
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Location-specific Details</h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddLocation}>
            <Plus className="h-4 w-4 mr-1" /> Add Location
          </Button>
        </div>

        {fields.map((field, index) => (
          <Card key={field.id} className="mt-4">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-md">Location {index + 1}</CardTitle>
              {fields.length > 1 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => remove(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <LocationSection
                value={form.watch(`locationItems.${index}.location_id`)}
                onValueChange={(value) => form.setValue(`locationItems.${index}.location_id`, value)}
                locations={locations}
              />

              <QuantitySection register={form.register} index={index} />

              <FormField
                control={form.control}
                name={`locationItems.${index}.unit_price`}
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
                value={form.watch(`locationItems.${index}.categories`)}
                onValueChange={(values) => form.setValue(`locationItems.${index}.categories`, values)}
                categories={categories}
              />

              <SupplierSection
                value={form.watch(`locationItems.${index}.supplier_id`)}
                onValueChange={(value) => form.setValue(`locationItems.${index}.supplier_id`, value)}
                suppliers={suppliers}
              />

              <StatusSection
                value={form.watch(`locationItems.${index}.status`)}
                onValueChange={(value) => form.setValue(`locationItems.${index}.status`, value as "active" | "inactive")}
              />
            </CardContent>
          </Card>
        ))}

        {fields.length === 0 && (
          <div className="text-center p-4 border border-dashed rounded-md">
            <p className="text-gray-500">Add at least one location to save this item.</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={fields.length === 0}>
          {defaultValues.name ? 'Update' : 'Create'} Item
        </Button>
      </form>
    </Form>
  );
}
