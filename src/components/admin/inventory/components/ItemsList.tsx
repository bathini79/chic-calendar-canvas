import { useState, useEffect } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemDialog } from "../ItemDialog";
import { Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import debounce from "lodash/debounce";
import { Database } from "@/integrations/supabase/types";

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'] & {
  inventory_items_categories: Array<{ category_id: string }>;
};

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

export function ItemsList() {
  const { remove } = useSupabaseCrud('inventory_items');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [displayItems, setDisplayItems] = useState<InventoryItem[]>([]);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Query for categories
  const { data: categories } = useQuery({
    queryKey: ['inventory_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
  });

  // Query for items with categories
  const { data: items, refetch } = useQuery({
    queryKey: ['inventory_items', selectedCategory, selectedStatus, searchQuery],
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
      return data as Supplier[];
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="w-[200px]">
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[200px]">
          <Select
            value={selectedStatus}
            onValueChange={setSelectedStatus}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              className="pl-10"
              placeholder="Search items..."
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Min. Quantity</TableHead>
              <TableHead>Max. Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant={item.quantity <= item.minimum_quantity ? "destructive" : "default"}>
                    {item.quantity} {item.unit_of_quantity}
                  </Badge>
                </TableCell>
                <TableCell>{item.minimum_quantity} {item.unit_of_quantity}</TableCell>
                <TableCell>{item.max_quantity} {item.unit_of_quantity}</TableCell>
                <TableCell>{item.unit_of_quantity}</TableCell>
                <TableCell>${Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell>
                  {suppliers?.find(s => s.id === item.supplier_id)?.name || '-'}
                </TableCell>
                <TableCell>
                  {categories
                    ?.filter(cat => item?.categories?.includes(cat.id))
                    .map(cat => (
                      <Badge key={cat.id} variant="secondary" className="mr-1">
                        {cat.name}
                      </Badge>
                    ))}
                </TableCell>
                <TableCell>
                  {editingStatus === item.id ? (
                    <div className="flex items-center gap-2">
                      <Select
                        defaultValue={item.status}
                        onValueChange={(value: "active" | "inactive") => handleStatusChange(item.id, value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingStatus(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      variant={item.status === 'active' ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => setEditingStatus(item.id)}
                    >
                      {item.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingItem(item)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
