import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package2, Tags } from "lucide-react";

export default function AdminInventory() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>
      
      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package2 className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Product Categories
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="products" className="mt-6">
          <div className="text-muted-foreground">
            Products management coming soon...
          </div>
        </TabsContent>
        
        <TabsContent value="categories" className="mt-6">
          <div className="text-muted-foreground">
            Product categories management coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}