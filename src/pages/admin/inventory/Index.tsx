import { Card } from "@/components/ui/card";
import { Package2, Tags } from "lucide-react";
import { Link } from "react-router-dom";

export function AdminInventory() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/admin/inventory/products">
          <Card className="p-6 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <Package2 className="w-8 h-8" />
              <div>
                <h2 className="text-lg font-semibold">Products</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your product catalog
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/inventory/categories">
          <Card className="p-6 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <Tags className="w-8 h-8" />
              <div>
                <h2 className="text-lg font-semibold">Product Categories</h2>
                <p className="text-sm text-muted-foreground">
                  Organize products by categories
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}