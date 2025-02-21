
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

interface Unit {
  id: string;
  name: string;
  is_default: boolean;
}

interface Supplier {
  id: string;
  name: string;
}

export function ItemForm({ defaultValues, onSubmit }: ItemFormProps) {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues,
  });

  const { data: categories } = useSupabaseCrud("inventory_categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [newUnit, setNewUnit] = useState("");
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  useEffect(() => {
    if (defaultValues.categories[0]) {
      setSelectedCategory(defaultValues.categories[0]);
    }
  }, [defaultValues.categories]);

  useEffect(() => {
    // Fetch suppliers
    const fetchSuppliers = async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("status", "active");

      if (error) {
        console.error("Error fetching suppliers:", error);
        return;
      }
      setSuppliers(data);
    };

    // Fetch units
    const fetchUnits = async () => {
      const { data, error } = await supabase
        .from("inventory_units")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching units:", error);
        return;
      }
      setUnits(data);
    };

    fetchSuppliers();
    fetchUnits();
  }, []);

  const handleSubmit = async (values: ItemFormValues) => {
    const formValues = {
      ...values,
      categories: selectedCategory ? [selectedCategory] : []
    };
    await onSubmit(formValues);
  };

  const handleAddUnit = async () => {
    if (!newUnit.trim()) {
      toast.error("Unit name cannot be empty");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("inventory_units")
        .insert([{ name: newUnit.toUpperCase(), is_default: false }])
        .select()
        .single();

      if (error) throw error;

      setUnits([...units, data]);
      setNewUnit("");
      setIsAddUnitOpen(false);
      toast.success("Unit added successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
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
          <label htmlFor="supplier" className="text-sm font-medium">
            Supplier
          </label>
          <Select
            value={form.watch("supplier_id")}
            onValueChange={(value) => form.setValue("supplier_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <Select
            value={selectedCategory || undefined}
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
