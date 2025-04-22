
import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DraftPurchaseOrdersProps {
  setEditingPurchaseOrder: (order: any) => void;
}

export function DraftPurchaseOrders({ setEditingPurchaseOrder }: DraftPurchaseOrdersProps) {
  const { data: purchaseOrders, remove: removePurchaseOrder, refetch } = useSupabaseCrud('purchase_orders');
  const [confirmingOrder, setConfirmingOrder] = useState<any>(null);

  // Filter for draft orders (status = 'draft')
  const draftOrders = purchaseOrders?.filter(order => order.status === 'draft') || [];

  const handleDeletePurchaseOrder = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this draft purchase order?')) {
      await removePurchaseOrder(id);
    }
  };

  const handleConfirmOrder = async () => {
    if (!confirmingOrder) return;

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'confirmed' })
        .eq('id', confirmingOrder.id);

      if (error) throw error;

      toast.success("Purchase order confirmed successfully");
      setConfirmingOrder(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="grid gap-4">
      {draftOrders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No draft purchase orders found.
        </div>
      ) : (
        draftOrders.map((order) => (
          <div key={order.id} className="bg-card p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold">Invoice #{order.invoice_number}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.order_date), 'PPP')}
                </p>
              </div>
              <Badge variant="secondary">
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setConfirmingOrder(order)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Purchase Order</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to confirm this purchase order? This will move it to the confirmed orders section and make it final.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmingOrder(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmOrder}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditingPurchaseOrder(order)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDeletePurchaseOrder(order.id)}
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
