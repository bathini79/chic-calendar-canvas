
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface InventoryStatsProps {
  selectedLocation?: string;
}

interface InventoryItemBase {
  id: string;
  quantity: number;
  minimum_quantity: number;
  unit_price: number;
  location_id?: string;
}

export function InventoryStats({ selectedLocation = 'all' }: InventoryStatsProps) {
  const { data: items = [] } = useQuery({
    queryKey: ['inventory_items', selectedLocation],
    queryFn: async () => {
      let query = supabase.from('inventory_items').select('id, quantity, minimum_quantity, unit_price, location_id');
      
      if (selectedLocation !== 'all') {
        query = query.eq('location_id', selectedLocation);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryItemBase[];
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-card p-4 rounded-lg">
        <h3 className="font-medium mb-2">Total Items</h3>
        <p className="text-2xl font-bold">{items.length || 0}</p>
      </div>
      <div className="bg-card p-4 rounded-lg">
        <h3 className="font-medium mb-2">Low Stock Items</h3>
        <p className="text-2xl font-bold text-yellow-500">
          {items.filter(item => item.quantity <= item.minimum_quantity).length || 0}
        </p>
      </div>
      <div className="bg-card p-4 rounded-lg">
        <h3 className="font-medium mb-2">Total Value</h3>
        <p className="text-2xl font-bold">
          ${items.reduce((total, item) => total + (item.quantity * Number(item.unit_price)), 0).toFixed(2) || '0.00'}
        </p>
      </div>
    </div>
  );
}
