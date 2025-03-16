
import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { itemSchema, type ItemFormValues } from "../schemas/item-schema";
import { useQueryClient } from "@tanstack/react-query";

export function useItemForm(item?: any, onClose?: () => void) {
  const [open, setOpen] = useState(false);
  const { create, update } = useSupabaseCrud("inventory_items");
  const queryClient = useQueryClient();

  const defaultValues: ItemFormValues = {
    name: item?.name || "",
    description: item?.description || "",
    quantity: item?.quantity ?? 0,
    minimum_quantity: item?.minimum_quantity ?? 0,
    max_quantity: item?.max_quantity ?? 100,
    unit_price: item?.unit_price ?? 0,
    categories: item?.categories || [],
    status: item?.status || "active",
    supplier_id: item?.supplier_id || "_none",
    unit_of_quantity: item?.unit_of_quantity || "",
    location_id: item?.location_id || "",
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
        status: values.status,
        supplier_id: values.supplier_id === "_none" ? null : values.supplier_id,
        unit_of_quantity: values.unit_of_quantity,
        categories: values.categories,
        location_id: values.location_id || null
      };

      if (item) {
        await update(item.id, itemData);
      } else {
        await create(itemData);
      }

      await queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      if (onClose) onClose();
    } catch (error: any) {
      console.error("Error saving item:", error);
      throw error;
    }
  };

  return {
    open,
    setOpen,
    defaultValues,
    handleSubmit,
  };
}
