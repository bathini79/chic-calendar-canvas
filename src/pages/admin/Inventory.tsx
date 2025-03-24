
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryDialog } from "@/components/admin/inventory/CategoryDialog";
import { CategoryList } from "@/components/admin/inventory/CategoryList";
import { SupplierDialog } from "@/components/admin/inventory/SupplierDialog";
import { SupplierList } from "@/components/admin/inventory/SupplierList";
import { InventoryStats } from "@/components/admin/inventory/components/InventoryStats";
import { ItemsList } from "@/components/admin/inventory/components/ItemsList";
import { PurchaseOrdersList } from "@/components/admin/inventory/components/PurchaseOrdersList";
import { HeaderActions } from "@/components/admin/inventory/components/HeaderActions";
import { AutoConsumption } from "@/components/admin/inventory/components/AutoConsumption";
import { ItemDialog } from "@/components/admin/inventory/ItemDialog";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showItemDialog, setShowItemDialog] = useState(false);

  const handleAddItem = () => {
    setShowItemDialog(true);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          <HeaderActions onAdd={handleAddItem} />
          <InventoryStats />
        </div>

        <div className="rounded-lg border bg-card">
          <Tabs defaultValue="items" className="w-full">
            <div className="border-b px-4">
              <TabsList className="bg-transparent">
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
                <TabsTrigger value="auto-consumption">Auto Consumption</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              <TabsContent value="items" className="m-0">
                <ItemsList />
              </TabsContent>

              <TabsContent value="categories" className="m-0">
                <div className="flex justify-end mb-4">
                  <CategoryDialog />
                </div>
                <CategoryList />
              </TabsContent>

              <TabsContent value="suppliers" className="m-0">
                <div className="flex justify-end mb-4">
                  <SupplierDialog />
                </div>
                <SupplierList />
              </TabsContent>

              <TabsContent value="purchase-orders" className="m-0">
                <PurchaseOrdersList />
              </TabsContent>
              
              <TabsContent value="auto-consumption" className="m-0">
                <AutoConsumption />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
      
      {showItemDialog && (
        <ItemDialog open={true} onClose={() => setShowItemDialog(false)} />
      )}
    </div>
  );
}
