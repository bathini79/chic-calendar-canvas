
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryDialog } from "@/components/admin/inventory/CategoryDialog";
import { CategoryList } from "@/components/admin/inventory/CategoryList";
import { SupplierDialog } from "@/components/admin/inventory/SupplierDialog";
import { SupplierList } from "@/components/admin/inventory/SupplierList";
import { InventoryStats } from "@/components/admin/inventory/components/InventoryStats";
import { ItemsList } from "@/components/admin/inventory/components/ItemsList";
import { PurchaseOrdersList } from "@/components/admin/inventory/components/PurchaseOrdersList";
import { ServiceInventoryRequirements } from "@/components/admin/inventory/ServiceInventoryRequirements";
import { LowStockManager } from "@/components/admin/inventory/LowStockManager";

export default function Inventory() {
  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory</h1>
      </div>

      <InventoryStats />

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="requirements">Service Requirements</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <ItemsList />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <CategoryDialog />
          </div>
          <CategoryList />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-end">
            <SupplierDialog />
          </div>
          <SupplierList />
        </TabsContent>

        <TabsContent value="purchase-orders" className="space-y-4">
          <PurchaseOrdersList />
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <ServiceInventoryRequirements />
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <LowStockManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
