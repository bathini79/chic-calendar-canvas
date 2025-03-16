
import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { itemSchema, type ItemFormValues } from "../schemas/item-schema";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useItemForm(item?: any, onClose?: () => void) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Prepare default values
  let locationItems = [];
  if (item?.id) {
    // For editing, we need to fetch the location-specific data
    locationItems = item.location_items || [];
  }

  const defaultValues: ItemFormValues = {
    name: item?.name || "",
    description: item?.description || "",
    unit_of_quantity: item?.unit_of_quantity || "",
    locationItems: locationItems.length ? locationItems.map(li => ({
      location_id: li.location_id,
      quantity: li.quantity,
      minimum_quantity: li.minimum_quantity,
      max_quantity: li.max_quantity,
      unit_price: li.unit_price,
      categories: li.categories || [],
      status: li.status || "active",
      supplier_id: li.supplier_id || "_none",
    })) : []
  };

  const handleSubmit = async (values: ItemFormValues) => {
    try {
      // First, create or update the base item
      const itemData = {
        name: values.name,
        description: values.description,
        unit_of_quantity: values.unit_of_quantity,
        has_location_specific_data: true
      };

      let itemId;
      if (item?.id) {
        // Update existing item
        const { data: updatedItem, error } = await supabase
          .from('inventory_items')
          .update(itemData)
          .eq('id', item.id)
          .select()
          .single();

        if (error) throw error;
        itemId = item.id;
      } else {
        // Create new item
        const { data: newItem, error } = await supabase
          .from('inventory_items')
          .insert(itemData)
          .select()
          .single();

        if (error) throw error;
        itemId = newItem.id;
      }

      // Now handle location-specific items
      for (const locationItem of values.locationItems) {
        const locationItemData = {
          item_id: itemId,
          location_id: locationItem.location_id,
          quantity: locationItem.quantity,
          minimum_quantity: locationItem.minimum_quantity,
          max_quantity: locationItem.max_quantity,
          unit_price: locationItem.unit_price,
          supplier_id: locationItem.supplier_id === "_none" ? null : locationItem.supplier_id,
          status: locationItem.status,
          categories: locationItem.categories
        };

        // Check if this location item already exists
        const { data: existingItems, error: checkError } = await supabase
          .from('inventory_location_items')
          .select('id')
          .eq('item_id', itemId)
          .eq('location_id', locationItem.location_id);

        if (checkError) throw checkError;

        if (existingItems.length > 0) {
          // Update existing location item
          const { error: updateError } = await supabase
            .from('inventory_location_items')
            .update(locationItemData)
            .eq('id', existingItems[0].id);

          if (updateError) throw updateError;
        } else {
          // Insert new location item
          const { error: insertError } = await supabase
            .from('inventory_location_items')
            .insert(locationItemData);

          if (insertError) throw insertError;
        }
      }

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory_location_items'] });
      
      toast.success(item?.id ? "Item updated successfully" : "Item created successfully");
      if (onClose) onClose();
    } catch (error: any) {
      console.error("Error saving item:", error);
      toast.error(error.message);
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
