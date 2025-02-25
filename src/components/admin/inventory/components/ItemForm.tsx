
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium">Name</label>
          <Input id="name" {...form.register("name")} />
        </div>
        
        <div>
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <Textarea id="description" {...form.register("description")} />
        </div>

        <QuantitySection register={form.register} />

        <div>
          <label htmlFor="unitPrice" className="text-sm font-medium">Unit Price</label>
          <Input
            id="unitPrice"
            type="number"
            min="0"
            step="0.01"
            {...form.register("unit_price", { valueAsNumber: true })}
          />
        </div>

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
