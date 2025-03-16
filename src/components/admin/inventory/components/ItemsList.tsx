
import { useState, useEffect } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { ItemDialog } from "../ItemDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import debounce from "lodash/debounce";
import { InventoryFilters } from "./list/InventoryFilters";
import { InventoryTable } from "./list/InventoryTable";
import { InventoryLocationItem } from "../types";

export function ItemsList() {
  const { remove } = useSupabaseCrud('inventory_items');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [displayItems, setDisplayItems] = useState<any[]>([]);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [showLowStock, setShowLowStock] = useState(false);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['inventory_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

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

  const { data: items = [], refetch } = useQuery({
    queryKey: ['inventory_items_with_locations', selectedCategory, selectedStatus, selectedLocation, searchQuery, showLowStock],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select(`
          *,
          inventory_location_items!inner(
            id,
            location_id,
            quantity,
            minimum_quantity,
            max_quantity,
            unit_price,
            supplier_id,
            status,
            categories
          )
        `);

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform the data to group location items by item
      const itemsMap = {};
      data.forEach(item => {
        if (!itemsMap[item.id]) {
          itemsMap[item.id] = {
            ...item,
            location_items: []
          };
        }
        
        const locationItem = item.inventory_location_items;
        itemsMap[item.id].location_items.push(locationItem);
      });

      return Object.values(itemsMap);
    }
  });

  // Filter items based on selected location and status
  useEffect(() => {
    if (items) {
      let filtered = [...items];
      
      // Filter by location
      if (selectedLocation !== "all") {
        filtered = filtered.filter(item => 
          item.location_items.some(li => li.location_id === selectedLocation)
        );
      }
      
      // Filter by category
      if (selectedCategory !== "all") {
        filtered = filtered.filter(item => 
          item.location_items.some(li => 
            li.categories && li.categories.includes(selectedCategory)
          )
        );
      }
      
      // Filter by status
      if (selectedStatus !== "all") {
        filtered = filtered.filter(item => 
          item.location_items.some(li => li.status === selectedStatus)
        );
      }
      
      // Filter by low stock
      if (showLowStock) {
        filtered = filtered.filter(item => 
          item.location_items.some(li => li.quantity <= li.minimum_quantity)
        );
      }
      
      setDisplayItems(filtered);
    }
  }, [items, selectedLocation, selectedCategory, selectedStatus, showLowStock]);

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await remove(id);
      refetch();
    }
  };

  const handleStatusChange = async (itemId: string, locationId: string, newStatus: "active" | "inactive") => {
    try {
      const { error } = await supabase
        .from('inventory_location_items')
        .update({ status: newStatus })
        .eq('item_id', itemId)
        .eq('location_id', locationId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['inventory_items_with_locations'] });
      toast.success(`Status updated to ${newStatus}`);
      setEditingStatus(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const debouncedSearch = debounce((value: string) => {
    setSearchQuery(value);
  }, 300);

  const handleEditItem = (item: any) => {
    setEditingItem(item);
  };

  return (
    <div className="space-y-4">
      <InventoryFilters
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        onSearchChange={(e) => debouncedSearch(e.target.value)}
        showLowStock={showLowStock}
        setShowLowStock={setShowLowStock}
        categories={categories}
        locations={locations}
      />

      <div className="bg-card rounded-lg">
        <InventoryTable
          items={displayItems}
          categories={categories}
          suppliers={suppliers}
          locations={locations}
          selectedLocation={selectedLocation}
          editingStatus={editingStatus}
          onStatusEdit={setEditingStatus}
          onStatusChange={handleStatusChange}
          onCancelEdit={() => setEditingStatus(null)}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
        />
      </div>

      <ItemDialog 
        open={editingItem !== null}
        item={editingItem} 
        onClose={() => {
          setEditingItem(null);
          refetch();
        }} 
      />
    </div>
  );
}
