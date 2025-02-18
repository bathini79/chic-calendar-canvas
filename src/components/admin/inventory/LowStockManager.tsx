
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

type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  minimum_quantity: number;
  max_quantity: number;
  supplier: {
    id: string;
    name: string;
  };
};

export function LowStockManager() {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: lowStockItems, isLoading } = useQuery({
    queryKey: ["low-stock-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .lte("quantity", "minimum_quantity")
        .eq("status", "active");

      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const generatePurchaseOrder = async () => {
    if (!lowStockItems?.length) {
      toast.error("No low stock items to order");
      return;
    }

    setIsGenerating(true);
    try {
      // Group items by supplier
      const supplierGroups = lowStockItems.reduce((acc: any, item: any) => {
        if (!acc[item.supplier.id]) {
          acc[item.supplier.id] = {
            supplier: item.supplier,
            items: [],
          };
        }
        acc[item.supplier.id].items.push(item);
        return acc;
      }, {});

      // Create POs for each supplier
      for (const group of Object.values(supplierGroups) as any[]) {
        // Create PO
        const { data: po, error: poError } = await supabase
          .from("purchase_orders")
          .insert({
            supplier_id: group.supplier.id,
            status: "pending",
            invoice_number: `PO-${format(new Date(), "yyyyMMdd-HHmmss")}`,
            order_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (poError) throw poError;

        // Add items to PO
        const poItems = group.items.map((item: any) => ({
          purchase_order_id: po.id,
          item_id: item.id,
          quantity: Math.max(item.max_quantity - item.quantity, 0),
          purchase_price: item.unit_price,
          unit_price: item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from("purchase_order_items")
          .insert(poItems);

        if (itemsError) throw itemsError;

        // Send email
        const { error: emailError } = await supabase.functions.invoke(
          "send-po-email",
          {
            body: { purchaseOrderId: po.id },
          }
        );

        if (emailError) throw emailError;

        toast.success(
          `Purchase order created and sent to ${group.supplier.name}`
        );
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Low Stock Items</h2>
        <Button
          onClick={generatePurchaseOrder}
          disabled={isGenerating || !lowStockItems?.length}
        >
          {isGenerating ? "Generating..." : "Generate Purchase Orders"}
        </Button>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {lowStockItems?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.minimum_quantity}</TableCell>
                <TableCell>{item.max_quantity}</TableCell>
                <TableCell>{item.supplier.name}</TableCell>
                <TableCell>
                  {Math.max(item.max_quantity - item.quantity, 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
