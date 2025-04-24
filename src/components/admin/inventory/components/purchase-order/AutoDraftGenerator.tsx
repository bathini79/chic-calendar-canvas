
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RotateCw } from "lucide-react";

export function AutoDraftGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

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
          suppliers(id, name, email, phone, contact_name)
        `)
        .lt('quantity', supabase.raw('minimum_quantity'))
        .eq("status", "active");

      if (error) throw error;
      return data || [];
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
        total_price: orderQuantity * item.unit_price
      });
    }
    
    return acc;
  }, {});

  // Check for low stock items and show toast notification
  useEffect(() => {
    if (lowStockItems && lowStockItems.length > 0 && !isLoading) {
      toast.info(`${lowStockItems.length} items are below minimum stock levels. Consider generating a purchase order.`);
    }
  }, [lowStockItems, isLoading]);

  const generateDraftOrders = async () => {
    if (!itemsBySupplier || Object.keys(itemsBySupplier).length === 0) {
      toast.error("No low stock items to order");
      return;
    }

    setIsGenerating(true);
    try {
      let ordersCreated = 0;
      
      // Create draft purchase orders for each supplier
      for (const supplierId of Object.keys(itemsBySupplier)) {
        const group = itemsBySupplier[supplierId];
        
        // Skip if no items to order for this supplier
        if (group.items.length === 0) continue;
        
        // Calculate total amount
        const totalAmount = group.items.reduce((sum: number, item: any) => 
          sum + item.total_price, 0
        );
        
        // Create the purchase order
        const { data: po, error: poError } = await supabase
          .from("purchase_orders")
          .insert({
            supplier_id: supplierId,
            status: "draft",
            invoice_number: `AUTO-${format(new Date(), "yyyyMMdd-HHmmss")}`,
            order_date: new Date().toISOString(),
            notes: "Auto-generated draft for low stock items",
            total_amount: totalAmount,
            tax_inclusive: false,
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
        
        ordersCreated++;
        toast.success(`Draft purchase order created for ${group.supplier.name}`);
      }
      
      if (ordersCreated > 0) {
        toast.success(`${ordersCreated} draft purchase order(s) created successfully`);
      } else {
        toast.info("No purchase orders were created");
      }
      
      // Refresh the purchase orders list
      refetch();
      setOpenDialog(false);
    } catch (error: any) {
      console.error("Error generating draft orders:", error);
      toast.error(error.message || "Error generating draft orders");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AlertDialog open={openDialog} onOpenChange={setOpenDialog}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          disabled={isLoading || isGenerating}
          onClick={() => {
            if (lowStockItems?.length === 0) {
              toast.info("There are no low stock items that need reordering");
            } else {
              setOpenDialog(true);
            }
          }}
        >
          {isGenerating ? (
            <>
              <RotateCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Draft Orders for Low Stock"
          )}
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
          <AlertDialogAction onClick={generateDraftOrders} disabled={!lowStockItems?.length}>
            Generate Draft Orders
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
