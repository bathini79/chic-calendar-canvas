
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InventoryStats() {
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: locationItems = [] } = useQuery({
    queryKey: ['inventory_location_items', selectedLocation],
    queryFn: async () => {
      let query = supabase
        .from('inventory_location_items')
        .select(`
          *,
          inventory_items!inner(id, name, description)
        `);
      
      if (selectedLocation !== "all") {
        query = query.eq('location_id', selectedLocation);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const filteredItems = selectedLocation === "all" 
    ? locationItems 
    : locationItems.filter(item => item.location_id === selectedLocation);

  const totalItems = filteredItems.length;
  const lowStockItems = filteredItems.filter(item => item.quantity <= item.minimum_quantity).length;
  const totalValue = filteredItems.reduce((total, item) => total + (item.quantity * Number(item.unit_price)), 0);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-lg">
          <h3 className="font-medium mb-2">Total Items</h3>
          <p className="text-2xl font-bold">{totalItems}</p>
        </div>
        <div className="bg-card p-4 rounded-lg">
          <h3 className="font-medium mb-2">Low Stock Items</h3>
          <p className="text-2xl font-bold text-yellow-500">
            {lowStockItems}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg">
          <h3 className="font-medium mb-2">Total Value</h3>
          <p className="text-2xl font-bold">
            ${totalValue.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>
    </div>
  );
}
