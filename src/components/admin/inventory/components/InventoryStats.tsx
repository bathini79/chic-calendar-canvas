
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";

export function InventoryStats() {
  const { data: items } = useSupabaseCrud('inventory_items');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-card p-4 rounded-lg">
        <h3 className="font-medium mb-2">Total Items</h3>
        <p className="text-2xl font-bold">{items?.length || 0}</p>
      </div>
      <div className="bg-card p-4 rounded-lg">
        <h3 className="font-medium mb-2">Low Stock Items</h3>
        <p className="text-2xl font-bold text-yellow-500">
          {items?.filter(item => item.quantity <= item.minimum_quantity).length || 0}
        </p>
      </div>
      <div className="bg-card p-4 rounded-lg">
        <h3 className="font-medium mb-2">Total Value</h3>
        <p className="text-2xl font-bold">
          ${items?.reduce((total, item) => total + (item.quantity * Number(item.unit_price)), 0).toFixed(2) || '0.00'}
        </p>
      </div>
    </div>
  );
}
