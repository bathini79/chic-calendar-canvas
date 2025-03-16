
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
import { Trash2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from "@/integrations/supabase/types";
import { Category, Supplier } from "../../types";

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'] & {
  inventory_items_categories: Array<{ category_id: string }>;
  categories: string[];
};

interface InventoryTableProps {
  items: InventoryItem[];
  categories?: Category[];
  suppliers?: Supplier[];
  locations?: any[];
  editingStatus: string | null;
  onStatusEdit: (id: string) => void;
  onStatusChange: (itemId: string, newStatus: "active" | "inactive") => void;
  onCancelEdit: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
}

export function InventoryTable({
  items,
  categories,
  suppliers,
  locations = [],
  editingStatus,
  onStatusEdit,
  onStatusChange,
  onCancelEdit,
  onEditItem,
  onDeleteItem,
}: InventoryTableProps) {
  const getLocationName = (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : 'No Location';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Location</TableHead>
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
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>{item.location_id ? getLocationName(item.location_id) : 'No Location'}</TableCell>
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
                    onValueChange={(value: "active" | "inactive") => onStatusChange(item.id, value)}
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
                    onClick={onCancelEdit}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Badge
                  variant={item.status === 'active' ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => onStatusEdit(item.id)}
                >
                  {item.status}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onEditItem(item)}
              >
                Edit
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onDeleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
