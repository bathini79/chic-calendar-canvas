
import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ItemFormValues } from "../schemas/item-schema";

export function useItemForm(item?: any, onClose?: () => void) {
  const [open, setOpen] = useState(false);
  const { create, update } = useSupabaseCrud("inventory_items");

  const defaultValues: ItemFormValues = {
    name: item?.name || "",
    description: item?.description || "",
    quantity: item?.quantity || 0,
    minimum_quantity: item?.minimum_quantity || 0,
    max_quantity: item?.max_quantity || 0,
    unit_price: item?.unit_price || 0,
    categories: item?.categories || [],
    status: item?.status || "active",
  };

  const handleSubmit = async (values: ItemFormValues) => {
    try {
      const itemData = {
        name: values.name,
        description: values.description,
        quantity: values.quantity,
        minimum_quantity: values.minimum_quantity,
        max_quantity: values.max_quantity,
        unit_price: values.unit_price,
        status: values.status
      };

      let savedItem;
      if (item) {
        savedItem = await update(item.id, itemData);
      } else {
        savedItem = await create(itemData);
      }

      if (savedItem && values.categories.length > 0) {
        if (item) {
          // Delete existing category relationships
          await supabase
            .from('inventory_items_categories')
            .delete()
            .eq('item_id', savedItem.id);
        }

        // Create new category relationships
        const { error } = await supabase
          .from('inventory_items_categories')
          .insert(
            values.categories.map(categoryId => ({
              item_id: savedItem.id,
              category_id: categoryId,
            }))
          );

        if (error) {
          toast.error("Error linking categories");
          return;
        }
      }

      toast.success(item ? "Item updated" : "Item created");
      setOpen(false);
      if (onClose) onClose();
    } catch (error: any) {
      toast.error(error.message);
      console.error("Error saving item:", error);
    }
  };

  return {
    open,
    setOpen,
    defaultValues,
    handleSubmit,
  };
}
