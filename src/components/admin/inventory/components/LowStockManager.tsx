import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { InventoryItem } from "../types";

export function LowStockManager() {
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const { data: items = [] } = useSupabaseCrud("inventory_items");

  useEffect(() => {
    const fetchLowStockItems = async () => {
      try {
        const { data, error } = await supabase
          .from("inventory_items")
          .select(`
            *,
            supplier:supplier_items(
              suppliers(
                id,
                name,
                email,
                phone,
                address,
                contact_name,
                status,
                created_at,
                updated_at
              )
            )
          `)
          .lt("quantity", "minimum_quantity");

        if (error) throw error;

        // Cast data to the correct type
        setLowStockItems(data as unknown as InventoryItem[]);
      } catch (error) {
        console.error("Error fetching low stock items:", error);
      }
    };

    fetchLowStockItems();
  }, [items]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Low Stock Items</h2>
      {lowStockItems.length === 0 ? (
        <p>No items are currently low in stock.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {lowStockItems.map((item) => (
            <Card key={item.id} className="p-4">
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <p className="text-gray-500">
                Quantity: {item.quantity} / Min: {item.minimum_quantity}
              </p>
              <p className="text-sm">
                Suggested Order Quantity: {item.suggested_order_quantity}
              </p>
              {item.supplier && item.supplier.length > 0 ? (
                <div className="mt-2">
                  <h4 className="text-sm font-medium">Suppliers:</h4>
                  <ul>
                    {item.supplier.map((supplierItem) => (
                      <li key={supplierItem.suppliers.id} className="text-xs">
                        {supplierItem.suppliers.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs">No suppliers associated with this item.</p>
              )}
              <Button className="w-full mt-4">Create Purchase Order</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
