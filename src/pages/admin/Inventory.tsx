
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

export default function Inventory() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="container py-6 space-y-4">
      <HeaderActions 
        onAdd={() => setIsDialogOpen(true)} 
        view={view} 
        onViewChange={setView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <InventoryStats />

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
