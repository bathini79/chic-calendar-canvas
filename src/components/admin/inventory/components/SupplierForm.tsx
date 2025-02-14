
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { supplierSchema, type SupplierFormValues } from "../schemas/supplier-schema";

interface SupplierFormProps {
  defaultValues: SupplierFormValues;
  supplierId?: string;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
}

export function SupplierForm({ defaultValues, supplierId, onSubmit }: SupplierFormProps) {
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues,
  });

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const { data: items, error } = await supabase
          .from('inventory_items')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
          
        if (error) throw error;
        setAvailableItems(items || []);
      } catch (error: any) {
        console.error('Error fetching items:', error);
        toast.error('Failed to load items');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, []);

  const handleSubmit = async (data: SupplierFormValues) => {
    try {
      await onSubmit(data);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <Input
          id="name"
          {...form.register("name")}
          required
        />
      </div>
      <div>
        <label htmlFor="contactName" className="text-sm font-medium">Contact Name</label>
        <Input
          id="contactName"
          {...form.register("contact_name")}
        />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
        />
      </div>
      <div>
        <label htmlFor="phone" className="text-sm font-medium">Phone</label>
        <Input
          id="phone"
          {...form.register("phone")}
        />
      </div>
      <div>
        <label htmlFor="address" className="text-sm font-medium">Address</label>
        <Textarea
          id="address"
          {...form.register("address")}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Items</label>
        <MultiSelect
          options={availableItems.map(item => ({
            label: item.name,
            value: item.id
          }))}
          selected={form.watch("items")}
          onChange={(values) => form.setValue("items", values)}
          placeholder={isLoading ? "Loading items..." : "Select items..."}
          className="w-full"
        />
        {availableItems.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground mt-1">
            No items available. Add items in the Items tab first.
          </p>
        )}
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit">
          {supplierId ? 'Update Supplier' : 'Create Supplier'}
        </Button>
      </div>
    </form>
  );
}
