
import { useState, useEffect } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { ItemDialog } from "../ItemDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import debounce from "lodash/debounce";
import { Database } from "@/integrations/supabase/types";
import { InventoryFilters } from "./list/InventoryFilters";
import { InventoryTable } from "./list/InventoryTable";

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'] & {
  inventory_items_categories: Array<{ category_id: string }>;
  categories: string[];
};

export function ItemsList() {
  const { remove } = useSupabaseCrud('inventory_items');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [displayItems, setDisplayItems] = useState<InventoryItem[]>([]);
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

  const { data: items, refetch } = useQuery({
    queryKey: ['inventory_items', selectedCategory, selectedStatus, searchQuery, showLowStock],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select(`
          *,
          inventory_items_categories (
            category_id
          )
        `);

      if (selectedStatus !== "all") {
        query = query.eq('status', selectedStatus);
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (showLowStock) {
        // Compare quantity with minimum_quantity column
        query = query.filter('quantity', 'lte', 'minimum_quantity');
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []).map((item: InventoryItem) => ({
        ...item,
        categories: item.inventory_items_categories.map(ic => ic.category_id)
      }));
    },
  });

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

  useEffect(() => {
    if (items) {
      if (selectedCategory === "all") {
        setDisplayItems(items);
      } else {
        setDisplayItems(
          items.filter(item => 
            item.categories.includes(selectedCategory)
          )
        );
      }
    }
  }, [items, selectedCategory]);

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await remove(id);
      refetch();
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: "active" | "inactive") => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ status: newStatus })
        .eq('id', itemId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      toast.success(`Status updated to ${newStatus}`);
      setEditingStatus(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const debouncedSearch = debounce((value: string) => {
    setSearchQuery(value);
  }, 300);

  return (
    <div className="space-y-4">
      <InventoryFilters
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        onSearchChange={debouncedSearch}
        showLowStock={showLowStock}
        setShowLowStock={setShowLowStock}
        categories={categories}
      />

      <div className="bg-card rounded-lg">
        <InventoryTable
          items={displayItems}
          categories={categories}
          suppliers={suppliers}
          editingStatus={editingStatus}
          onStatusEdit={setEditingStatus}
          onStatusChange={handleStatusChange}
          onCancelEdit={() => setEditingStatus(null)}
          onEditItem={setEditingItem}
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
