
import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { EyeIcon, Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConfirmedPurchaseOrdersProps {
  setEditingPurchaseOrder: (order: any) => void;
}

export function ConfirmedPurchaseOrders({ setEditingPurchaseOrder }: ConfirmedPurchaseOrdersProps) {
  const { data: purchaseOrders, refetch } = useSupabaseCrud('purchase_orders');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter for confirmed orders (status = 'confirmed' or 'pending')
  const confirmedOrders = purchaseOrders?.filter(order => 
    order.status === 'confirmed' || order.status === 'pending'
  ) || [];

  const handleDeletePurchaseOrder = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        setIsDeleting(true);
        
        // First, delete all associated order items
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', id);
          
        if (itemsError) {
          throw itemsError;
        }
        
        // Then delete the purchase order
        const { error: orderError } = await supabase
          .from('purchase_orders')
          .delete()
          .eq('id', id);
          
        if (orderError) {
          throw orderError;
        }
        
        toast.success("Purchase order deleted successfully");
        refetch();
      } catch (error: any) {
        toast.error(`Error deleting purchase order: ${error.message}`);
        console.error("Error deleting purchase order:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="grid gap-4">
      {confirmedOrders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No confirmed purchase orders found.
        </div>
      ) : (
        confirmedOrders.map((order) => (
          <div key={order.id} className="bg-card p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold">Invoice #{order.invoice_number}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.order_date), 'PPP')}
                </p>
              </div>
              <Badge variant={order.status === 'pending' ? "secondary" : "default"}>
                {order.status}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Supplier:</span> {order.supplier_id}
              </div>
              <div className="text-sm">
                <span className="font-medium">Tax Inclusive:</span> {order.tax_inclusive ? 'Yes' : 'No'}
              </div>
              {order.notes && (
                <div className="text-sm">
                  <span className="font-medium">Notes:</span> {order.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditingPurchaseOrder(order)}
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDeletePurchaseOrder(order.id)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
