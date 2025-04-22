
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { PurchaseOrderDialog } from "../PurchaseOrderDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DraftPurchaseOrders } from "./purchase-order/DraftPurchaseOrders";
import { ConfirmedPurchaseOrders } from "./purchase-order/ConfirmedPurchaseOrders";

export function PurchaseOrdersList() {
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<any>(null);

  const handleCloseEditDialog = () => {
    setEditingPurchaseOrder(null);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <PurchaseOrderDialog />
      </div>
      
      <Tabs defaultValue="draft" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="draft">Draft Purchase Orders</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed Purchase Orders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="draft" className="mt-0">
          <DraftPurchaseOrders 
            setEditingPurchaseOrder={setEditingPurchaseOrder} 
          />
        </TabsContent>
        
        <TabsContent value="confirmed" className="mt-0">
          <ConfirmedPurchaseOrders 
            setEditingPurchaseOrder={setEditingPurchaseOrder} 
          />
        </TabsContent>
      </Tabs>
      
      {editingPurchaseOrder && (
        <PurchaseOrderDialog
          purchaseOrder={editingPurchaseOrder}
          onClose={handleCloseEditDialog}
        />
      )}
    </>
  );
}
