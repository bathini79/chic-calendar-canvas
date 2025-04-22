
import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { EyeIcon, Printer, Trash2 } from "lucide-react";

interface ConfirmedPurchaseOrdersProps {
  setEditingPurchaseOrder: (order: any) => void;
}

export function ConfirmedPurchaseOrders({ setEditingPurchaseOrder }: ConfirmedPurchaseOrdersProps) {
  const { data: purchaseOrders, remove: removePurchaseOrder } = useSupabaseCrud('purchase_orders');
  
  // Filter for confirmed orders (status = 'confirmed' or 'pending')
  const confirmedOrders = purchaseOrders?.filter(order => 
    order.status === 'confirmed' || order.status === 'pending'
  ) || [];

  const handleDeletePurchaseOrder = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      await removePurchaseOrder(id);
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
