
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { AutoDraftGenerator } from "./components/purchase-order/AutoDraftGenerator";

export function LowStockManager() {
  const { data: lowStockItems, isLoading } = useQuery({
    queryKey: ["low-stock-items"],
    queryFn: async () => {
      // Using raw SQL for the comparison to ensure it works correctly
      const { data, error } = await supabase
        .from("inventory_location_items")
        .select(`
          id,
          item_id,
          location_id,
          quantity,
          minimum_quantity,
          max_quantity,
          unit_price,
          supplier_id,
          inventory_items!inner(id, name, unit_of_quantity),
          suppliers(id, name)
        `)
        .filter('quantity', 'lte', 'minimum_quantity')  // Fix: Using filter syntax
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Low Stock Items</h2>
        <AutoDraftGenerator />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Minimum Stock</TableHead>
              <TableHead>Maximum Stock</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Required Quantity</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Total Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lowStockItems?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  No low stock items found.
                </TableCell>
              </TableRow>
            ) : (
              lowStockItems?.map((item: any) => {
                const requiredQuantity = Math.max(item.max_quantity - item.quantity, 0);
                const totalCost = requiredQuantity * item.unit_price;
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.inventory_items.name}</TableCell>
                    <TableCell>{item.quantity} {item.inventory_items.unit_of_quantity}</TableCell>
                    <TableCell>{item.minimum_quantity} {item.inventory_items.unit_of_quantity}</TableCell>
                    <TableCell>{item.max_quantity} {item.inventory_items.unit_of_quantity}</TableCell>
                    <TableCell>{item.suppliers?.name || 'No supplier'}</TableCell>
                    <TableCell>{requiredQuantity} {item.inventory_items.unit_of_quantity}</TableCell>
                    <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                    <TableCell>${totalCost.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
