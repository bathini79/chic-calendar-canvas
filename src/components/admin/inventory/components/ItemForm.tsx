
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  const [newUnit, setNewUnit] = useState("");
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  const handleAddUnit = async () => {
    if (!newUnit.trim()) {
      toast.error("Unit name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("inventory_units")
        .insert([{ name: newUnit.toUpperCase() }]);

      if (error) throw error;

      toast.success("Unit added successfully");
      setNewUnit("");
      setIsAddUnitOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory_units'] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="quantity" className="text-sm font-medium">Quantity</label>
            <Input
              id="quantity"
              type="number"
              min="0"
              {...form.register("quantity", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label htmlFor="minimumQuantity" className="text-sm font-medium">Minimum Quantity</label>
            <Input
              id="minimumQuantity"
              type="number"
              min="0"
              {...form.register("minimum_quantity", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label htmlFor="maxQuantity" className="text-sm font-medium">Maximum Quantity</label>
            <Input
              id="maxQuantity"
              type="number"
              min="0"
              {...form.register("max_quantity", { valueAsNumber: true })}
            />
          </div>
        </div>

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

        <div>
          <label className="text-sm font-medium">Unit of Quantity</label>
          <div className="flex gap-2">
            <Select
              value={form.watch("unit_of_quantity")}
              onValueChange={(value) => form.setValue("unit_of_quantity", value)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.name}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Unit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Unit Name</label>
                    <Input
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder="e.g., BOX"
                    />
                  </div>
                  <Button type="button" onClick={handleAddUnit}>
                    Add Unit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Supplier</label>
          <Select
            value={form.watch("supplier_id")}
            onValueChange={(value) => form.setValue("supplier_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Status</label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) => form.setValue("status", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
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
