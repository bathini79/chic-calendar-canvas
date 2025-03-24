import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InventoryTable } from "./list/InventoryTable";
import { InventoryFilters } from "./list/InventoryFilters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ItemDialog } from "../ItemDialog";
import { Category, Supplier } from "./types";

export function ItemsList() {
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch inventory items with location-specific data
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          id,
          name,
          description,
          unit_of_quantity,
          has_location_specific_data,
          created_at,
          updated_at,
          location_items:inventory_location_items(
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

      if (error) {
        console.error("Error fetching inventory items:", error);
        throw error;
      }
      return data || [];
    },
  });

  // Fetch categories for filtering
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["inventory_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_categories")
        .select("id, name");

      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch suppliers for filtering
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name");

      if (error) throw error;
      return data as Supplier[];
    },
  });

  // Fetch locations for filtering
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("status", "active");

      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  // Filter items based on search, category, supplier, location, and status
  const filteredItems = items?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      item.location_items.some(
        (li) => li.categories && li.categories.includes(selectedCategory)
      );
    const matchesSupplier =
      selectedSupplier === "all" ||
      item.location_items.some(
        (li) => li.supplier_id === selectedSupplier
      );
    const matchesLocation =
      selectedLocation === "all" ||
      item.location_items.some(
        (li) => li.location_id === selectedLocation
      );
    const matchesStatus =
      selectedStatus === "all" ||
      item.location_items.some(
        (li) => li.status === selectedStatus
      );

    return matchesSearch && matchesCategory && matchesSupplier && matchesLocation && matchesStatus;
  });

  // Mutation for updating item status
  const statusMutation = useMutation({
    mutationFn: async ({
      itemId,
      locationId,
      newStatus,
    }: {
      itemId: string;
      locationId: string;
      newStatus: "active" | "inactive";
    }) => {
      const { error } = await supabase
        .from("inventory_location_items")
        .update({ status: newStatus })
        .eq("item_id", itemId)
        .eq("location_id", locationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Status updated successfully");
      setEditingStatus(null);
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    },
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Item deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    },
  });

  // Handle status edit
  const handleStatusEdit = (id: string) => {
    setEditingStatus(id);
  };

  // Handle status change
  const handleStatusChange = (itemId: string, locationId: string, newStatus: "active" | "inactive") => {
    statusMutation.mutate({ itemId, locationId, newStatus });
  };

  // Handle delete item
  const handleDeleteItem = (id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(id);
    }
  };

  // Handle edit item
  const handleEditItem = (item: any) => {
    setEditingItem(item);
  };

  const handleAddItem = () => {
    setShowItemDialog(true);
  };

  const handleCloseDialog = () => {
    setEditingItem(null);
    setShowItemDialog(false);
  };

  if (itemsLoading || categoriesLoading || suppliersLoading || locationsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <InventoryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories || []}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        suppliers={suppliers || []}
        selectedSupplier={selectedSupplier}
        onSupplierChange={setSelectedSupplier}
        locations={locations || []}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      <InventoryTable
        items={filteredItems || []}
        categories={categories}
        suppliers={suppliers}
        locations={locations}
        selectedLocation={selectedLocation}
        editingStatus={editingStatus}
        onStatusEdit={handleStatusEdit}
        onStatusChange={handleStatusChange}
        onCancelEdit={() => setEditingStatus(null)}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
      />

      {(editingItem || showItemDialog) && (
        <ItemDialog item={editingItem} onClose={handleCloseDialog} open={true} />
      )}
    </div>
  );
}
