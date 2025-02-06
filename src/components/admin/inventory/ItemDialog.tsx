
import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ItemDialogProps {
  item?: any;
  onClose?: () => void;
}

export function ItemDialog({ item, onClose }: ItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [sku, setSku] = useState(item?.sku || "");
  const [quantity, setQuantity] = useState(item?.quantity || 0);
  const [minimumQuantity, setMinimumQuantity] = useState(item?.minimum_quantity || 0);
  const [unitPrice, setUnitPrice] = useState(item?.unit_price || 0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(item?.categories || []);

  const { create, update } = useSupabaseCrud("inventory_items");
  const { data: categories } = useSupabaseCrud("inventory_categories");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemData = {
        name,
        description,
        sku,
        quantity,
        minimum_quantity: minimumQuantity,
        unit_price: unitPrice,
        status: 'active'
      };

      let savedItem;
      if (item) {
        savedItem = await update(item.id, itemData);
      } else {
        savedItem = await create(itemData);
      }

      if (savedItem && selectedCategories.length > 0) {
        // First remove existing categories if updating
        if (item) {
          await supabase
            .from('inventory_items_categories')
            .delete()
            .eq('item_id', savedItem.id);
        }

        // Add new categories
        const { error } = await supabase
          .from('inventory_items_categories')
          .insert(
            selectedCategories.map(categoryId => ({
              item_id: savedItem.id,
              category_id: categoryId,
            }))
          );

        if (error) {
          toast.error("Error linking categories");
          return;
        }
      }

      // Reset form
      setName("");
      setDescription("");
      setSku("");
      setQuantity(0);
      setMinimumQuantity(0);
      setUnitPrice(0);
      setSelectedCategories([]);
      setOpen(false);
      if (onClose) onClose();
    } catch (error) {
      console.error("Error saving item:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {item ? 'Edit Item' : 'Add Item'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sku" className="text-sm font-medium">
              SKU
            </label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="text-sm font-medium">
                Quantity
              </label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                required
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
                value={minimumQuantity}
                onChange={(e) => setMinimumQuantity(parseInt(e.target.value))}
                required
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
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value))}
              required
            />
          </div>
          <div>
            <label htmlFor="categories" className="text-sm font-medium">
              Categories
            </label>
            <Select
              value={selectedCategories[0]}
              onValueChange={(value) => setSelectedCategories([value])}
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
            {item ? 'Update' : 'Create'} Item
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
