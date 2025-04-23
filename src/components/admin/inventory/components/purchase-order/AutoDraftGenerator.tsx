
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function AutoDraftGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch low stock items that need reordering
  const { data: lowStockItems, isLoading, refetch } = useQuery({
    queryKey: ["low-stock-items"],
    queryFn: async () => {
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
          inventory_items!inner(name, unit_of_quantity),
          suppliers(id, name, email, phone)
        `)
        .lte('quantity', 'minimum_quantity') // This comparison needs to use values, not field names
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  // Group items by supplier
  const itemsBySupplier = lowStockItems?.reduce((acc: any, item: any) => {
    if (!item.supplier_id) return acc;
    
    if (!acc[item.supplier_id]) {
      acc[item.supplier_id] = {
        supplier: item.suppliers,
        items: [],
      };
    }
    
    // Calculate suggested order quantity
    const orderQuantity = Math.max(item.max_quantity - item.quantity, 0);
    
    if (orderQuantity > 0) {
      acc[item.supplier_id].items.push({
        ...item,
        name: item.inventory_items.name,
        unit_of_quantity: item.inventory_items.unit_of_quantity,
        order_quantity: orderQuantity,
      });
    }
    
    return acc;
  }, {});

  const generateDraftOrders = async () => {
    if (!itemsBySupplier || Object.keys(itemsBySupplier).length === 0) {
      toast.error("No low stock items to order");
      return;
    }

    setIsGenerating(true);
    try {
      // Create draft purchase orders for each supplier
      for (const supplierId of Object.keys(itemsBySupplier)) {
        const group = itemsBySupplier[supplierId];
        
        // Skip if no items to order for this supplier
        if (group.items.length === 0) continue;
        
        // Create the purchase order
        const { data: po, error: poError } = await supabase
          .from("purchase_orders")
          .insert({
            supplier_id: supplierId,
            status: "draft",
            invoice_number: `AUTO-${format(new Date(), "yyyyMMdd-HHmmss")}`,
            order_date: new Date().toISOString(),
            notes: "Auto-generated draft for low stock items",
          })
          .select()
          .single();

        if (poError) throw poError;

        // Add items to the purchase order
        const poItems = group.items.map((item: any) => ({
          purchase_order_id: po.id,
          item_id: item.item_id,
          quantity: item.order_quantity,
          purchase_price: item.unit_price,
          unit_price: item.unit_price,
          tax_rate: 0, // Default tax rate
        }));

        const { error: itemsError } = await supabase
          .from("purchase_order_items")
          .insert(poItems);

        if (itemsError) throw itemsError;

        toast.success(`Draft purchase order created for ${group.supplier.name}`);
      }
      
      // Refresh the purchase orders list
      refetch();
    } catch (error: any) {
      console.error("Error generating draft orders:", error);
      toast.error(error.message || "Error generating draft orders");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          disabled={isLoading || isGenerating || !lowStockItems?.length}
        >
          {isGenerating ? "Generating..." : "Generate Draft Orders for Low Stock"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate Draft Purchase Orders</AlertDialogTitle>
          <AlertDialogDescription>
            This will create draft purchase orders for all items that are below their minimum quantity threshold.
            {lowStockItems && lowStockItems.length > 0 ? (
              <p className="mt-2">
                {lowStockItems.length} item(s) need to be ordered from {Object.keys(itemsBySupplier || {}).length} supplier(s).
              </p>
            ) : (
              <p className="mt-2">No low stock items found that need reordering.</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={generateDraftOrders}>
            Generate Draft Orders
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
